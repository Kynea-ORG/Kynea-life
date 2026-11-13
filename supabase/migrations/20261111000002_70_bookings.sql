-- ============================================================
-- 70 — Reservas de clases (Fase 1: sin pago online)
--
-- Una clase puede aceptar reservas de dos formas (classes.booking_mode):
--   'class'   → se reserva la clase completa (taller, curso, evento).
--   'session' → se reserva UNA fecha concreta de una clase semanal (class_sessions).
--   'none'    → solo contacto por WhatsApp/Instagram (comportamiento de siempre).
--
-- Cupos: la fuente de verdad son las reservas, NO classes.available_spots (que se reiniciaba
-- en cada edición). Toda reserva pasa por reserve_booking(), que bloquea la fila de la clase
-- (FOR UPDATE) para que dos personas no se lleven el último cupo.
--
-- Escritura SOLO por RPC: los clientes no pueden insertar/actualizar bookings ni sesiones.
-- Zona horaria: por ahora "hoy" se calcula en America/Lima (igual que getTodayLima en la app).
-- Soporte multipaís (zona horaria por sede) llega antes del pago online.
-- ============================================================

-- ── 1. COLUMNAS NUEVAS EN CLASSES ────────────────────────────────────────────

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS booking_mode text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS cancellation_policy text NOT NULL DEFAULT 'moderada';

ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_booking_mode_check;
ALTER TABLE public.classes
  ADD CONSTRAINT classes_booking_mode_check CHECK (booking_mode IN ('none', 'class', 'session'));

ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_cancellation_policy_check;
ALTER TABLE public.classes
  ADD CONSTRAINT classes_cancellation_policy_check CHECK (cancellation_policy IN ('flexible', 'moderada', 'estricta'));

-- ── 2. SESIONES (una fecha concreta de una clase semanal) ────────────────────

CREATE TABLE IF NOT EXISTS public.class_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id     uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  start_time   time NOT NULL,
  end_time     time NOT NULL,
  capacity     integer CHECK (capacity IS NULL OR capacity > 0),  -- NULL = sin límite
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'cancelled')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, session_date, start_time)
);

CREATE INDEX IF NOT EXISTS class_sessions_class_date_idx
  ON public.class_sessions (class_id, session_date);

-- ── 3. RESERVAS ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bookings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id       uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  session_id     uuid REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  status         text NOT NULL DEFAULT 'confirmed'
                   CHECK (status IN ('hold', 'pending_payment', 'confirmed', 'cancelled', 'expired', 'attended', 'no_show')),
  seats          integer NOT NULL DEFAULT 1 CHECK (seats BETWEEN 1 AND 10),
  -- Foto del precio al reservar (la clase puede cambiar de precio después).
  price_amount   numeric(10,2) NOT NULL DEFAULT 0 CHECK (price_amount >= 0),
  currency       text NOT NULL DEFAULT 'PEN',
  payment_method text NOT NULL DEFAULT 'free' CHECK (payment_method IN ('free', 'pay_at_venue', 'online')),
  expires_at     timestamptz,           -- solo holds/pagos pendientes (Fase 2)
  cancelled_at   timestamptz,
  cancelled_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cancel_reason  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at_bookings ON public.bookings;
CREATE TRIGGER set_updated_at_bookings
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Una reserva activa por persona y clase/fecha (impide reservar dos veces lo mismo).
CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_active_per_target_idx
  ON public.bookings (user_id, class_id, COALESCE(session_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status IN ('hold', 'pending_payment', 'confirmed');

CREATE INDEX IF NOT EXISTS bookings_user_idx ON public.bookings (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_class_idx ON public.bookings (class_id, status);
CREATE INDEX IF NOT EXISTS bookings_session_idx ON public.bookings (session_id) WHERE session_id IS NOT NULL;

-- ── 4. COLA DE CORREOS (la llena el servidor con service role; sin acceso de clientes) ─

CREATE TABLE IF NOT EXISTS public.email_outbox (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email    text NOT NULL,
  template    text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts    integer NOT NULL DEFAULT 0,
  last_error  text,
  dedupe_key  text UNIQUE,             -- evita duplicar el mismo correo (ej. 'booking_confirmed:<id>')
  created_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz
);

CREATE INDEX IF NOT EXISTS email_outbox_pending_idx ON public.email_outbox (created_at) WHERE status = 'pending';

-- ── 5. RLS Y GRANTS ──────────────────────────────────────────────────────────

ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_outbox   ENABLE ROW LEVEL SECURITY;

-- Los grants por defecto dan CRUD a authenticated y SELECT a anon: aquí la escritura es solo por RPC.
REVOKE INSERT, UPDATE, DELETE ON public.class_sessions FROM anon, authenticated;
REVOKE ALL ON public.bookings FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.bookings FROM authenticated;
REVOKE ALL ON public.email_outbox FROM anon, authenticated;

DROP POLICY IF EXISTS "class_sessions_select" ON public.class_sessions;
CREATE POLICY "class_sessions_select" ON public.class_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_id
        AND (c.status = 'published' OR c.teacher_id = auth.uid() OR public.is_admin())
    )
  );

-- Cada quien ve sus reservas; el profesor ve las de sus clases; admin ve todas.
DROP POLICY IF EXISTS "bookings_select" ON public.bookings;
CREATE POLICY "bookings_select" ON public.bookings
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid())
  );

-- ── 6. CUPOS DE LA CLASE COMPLETA (classes.available_spots derivado de las reservas) ─

CREATE OR REPLACE FUNCTION public.sync_class_available_spots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_class_id uuid := COALESCE(NEW.class_id, OLD.class_id);
  v_taken integer;
BEGIN
  SELECT COALESCE(SUM(seats), 0) INTO v_taken
  FROM public.bookings
  WHERE class_id = v_class_id
    AND session_id IS NULL
    AND status IN ('hold', 'pending_payment', 'confirmed', 'attended', 'no_show');

  UPDATE public.classes
  SET available_spots = GREATEST(max_spots - v_taken, 0)
  WHERE id = v_class_id
    AND booking_mode = 'class'
    AND max_spots IS NOT NULL;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS bookings_sync_available_spots ON public.bookings;
CREATE TRIGGER bookings_sync_available_spots
  AFTER INSERT OR UPDATE OF status, seats ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_class_available_spots();

-- ── 7. RPC: GENERAR SESIONES DE UNA CLASE SEMANAL ────────────────────────────
-- Crea una fila por cada fecha entre start_date y end_date que coincida con class_schedules.
-- Idempotente. Solo dueño de la clase o admin. Máximo 120 días hacia adelante.

CREATE OR REPLACE FUNCTION public.generate_class_sessions(p_class_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_class record;
  v_today date := (now() AT TIME ZONE 'America/Lima')::date;
  v_from date;
  v_to date;
  v_count integer;
BEGIN
  SELECT id, teacher_id, booking_mode, start_date, end_date, max_spots
    INTO v_class FROM public.classes WHERE id = p_class_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLASS_NOT_FOUND' USING ERRCODE = 'no_data_found';
  END IF;
  IF NOT (public.is_admin() OR v_class.teacher_id = auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ALLOWED' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_class.booking_mode <> 'session' THEN
    RETURN 0;
  END IF;

  v_from := GREATEST(COALESCE(v_class.start_date, v_today), v_today);
  v_to   := LEAST(COALESCE(v_class.end_date, v_from + 90), v_from + 120);

  INSERT INTO public.class_sessions (class_id, session_date, start_time, end_time, capacity)
  SELECT p_class_id, d::date, s.start_time, s.end_time, v_class.max_spots
  FROM generate_series(v_from, v_to, interval '1 day') AS d
  JOIN public.class_schedules s
    ON s.class_id = p_class_id
   AND s.day_of_week = (EXTRACT(ISODOW FROM d)::int - 1)   -- 0 = Lunes
  ON CONFLICT (class_id, session_date, start_time) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Las fechas futuras sin reservas toman el cupo actual de la clase.
  UPDATE public.class_sessions cs
  SET capacity = v_class.max_spots
  WHERE cs.class_id = p_class_id
    AND cs.session_date >= v_today
    AND cs.capacity IS DISTINCT FROM v_class.max_spots
    AND NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.session_id = cs.id AND b.status IN ('hold', 'pending_payment', 'confirmed', 'attended', 'no_show')
    );

  RETURN v_count;
END;
$$;

-- ── 8. RPC: RESERVAR ─────────────────────────────────────────────────────────
-- Errores (mensaje = código que la app traduce): NOT_AUTHENTICATED, INVALID_SEATS,
-- CLASS_NOT_BOOKABLE, OWN_CLASS, PAST_DATE, SESSION_NOT_FOUND, ALREADY_BOOKED, SOLD_OUT.

CREATE OR REPLACE FUNCTION public.reserve_booking(
  p_class_id   uuid,
  p_session_id uuid DEFAULT NULL,
  p_seats      integer DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'America/Lima')::date;
  v_class record;
  v_session record;
  v_capacity integer;
  v_taken integer;
  v_unit numeric(10,2);
  v_total numeric(10,2);
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_seats IS NULL OR p_seats < 1 OR p_seats > 10 THEN
    RAISE EXCEPTION 'INVALID_SEATS' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Bloquea la clase: serializa las reservas concurrentes sobre los mismos cupos.
  SELECT id, teacher_id, status, booking_mode, price_type, price, offer_price, currency,
         max_spots, start_date, end_date, external_organizer_name
    INTO v_class
    FROM public.classes WHERE id = p_class_id FOR UPDATE;

  IF NOT FOUND
     OR v_class.status <> 'published'
     OR v_class.booking_mode = 'none'
     OR v_class.teacher_id IS NULL
     OR v_class.external_organizer_name IS NOT NULL THEN
    RAISE EXCEPTION 'CLASS_NOT_BOOKABLE' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF v_class.teacher_id = v_uid THEN
    RAISE EXCEPTION 'OWN_CLASS' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_class.booking_mode = 'class' THEN
    IF p_session_id IS NOT NULL THEN
      RAISE EXCEPTION 'CLASS_NOT_BOOKABLE' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    IF COALESCE(v_class.end_date, v_class.start_date) < v_today THEN
      RAISE EXCEPTION 'PAST_DATE' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    v_capacity := v_class.max_spots;
  ELSE
    SELECT id, session_date, capacity, status INTO v_session
      FROM public.class_sessions WHERE id = p_session_id AND class_id = p_class_id;
    IF NOT FOUND OR v_session.status <> 'open' THEN
      RAISE EXCEPTION 'SESSION_NOT_FOUND' USING ERRCODE = 'no_data_found';
    END IF;
    IF v_session.session_date < v_today THEN
      RAISE EXCEPTION 'PAST_DATE' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    v_capacity := v_session.capacity;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE user_id = v_uid AND class_id = p_class_id
      AND session_id IS NOT DISTINCT FROM p_session_id
      AND status IN ('hold', 'pending_payment', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'ALREADY_BOOKED' USING ERRCODE = 'unique_violation';
  END IF;

  SELECT COALESCE(SUM(seats), 0) INTO v_taken
  FROM public.bookings
  WHERE class_id = p_class_id
    AND session_id IS NOT DISTINCT FROM p_session_id
    AND status IN ('hold', 'pending_payment', 'confirmed', 'attended', 'no_show');

  IF v_capacity IS NOT NULL AND v_taken + p_seats > v_capacity THEN
    RAISE EXCEPTION 'SOLD_OUT' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_unit := CASE
    WHEN v_class.price_type = 'Gratis' THEN 0
    ELSE COALESCE(NULLIF(v_class.offer_price, 0), v_class.price, 0)
  END;
  v_total := v_unit * p_seats;

  INSERT INTO public.bookings (user_id, class_id, session_id, status, seats, price_amount, currency, payment_method)
  VALUES (
    v_uid, p_class_id, p_session_id, 'confirmed', p_seats, v_total, v_class.currency,
    CASE WHEN v_total = 0 THEN 'free' ELSE 'pay_at_venue' END
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ── 9. RPC: CANCELAR UNA RESERVA ─────────────────────────────────────────────
-- La puede cancelar quien reservó, el profesor dueño de la clase o un admin.

CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_booking record;
  v_teacher uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT b.id, b.user_id, b.class_id, b.status INTO v_booking
    FROM public.bookings b WHERE b.id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT teacher_id INTO v_teacher FROM public.classes WHERE id = v_booking.class_id;
  IF NOT (v_booking.user_id = v_uid OR v_teacher = v_uid OR public.is_admin()) THEN
    RAISE EXCEPTION 'NOT_ALLOWED' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_booking.status NOT IN ('hold', 'pending_payment', 'confirmed') THEN
    RAISE EXCEPTION 'NOT_CANCELLABLE' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled', cancelled_at = now(), cancelled_by = v_uid,
      cancel_reason = NULLIF(btrim(COALESCE(p_reason, '')), '')
  WHERE id = p_booking_id;
END;
$$;

-- ── 10. RPC: ASISTENCIA (profesor) ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_booking_attendance(p_booking_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_booking record;
  v_teacher uuid;
BEGIN
  IF p_status NOT IN ('attended', 'no_show') THEN
    RAISE EXCEPTION 'INVALID_STATUS' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT b.id, b.class_id, b.status INTO v_booking
    FROM public.bookings b WHERE b.id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT teacher_id INTO v_teacher FROM public.classes WHERE id = v_booking.class_id;
  IF NOT (v_teacher = v_uid OR public.is_admin()) THEN
    RAISE EXCEPTION 'NOT_ALLOWED' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_booking.status NOT IN ('confirmed', 'attended', 'no_show') THEN
    RAISE EXCEPTION 'NOT_CANCELLABLE' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE public.bookings SET status = p_status WHERE id = p_booking_id;
END;
$$;

-- ── 11. RPC: CANCELAR UNA FECHA (profesor) ───────────────────────────────────
-- Cancela la sesión y todas sus reservas activas. Devuelve cuántas reservas canceló.

CREATE OR REPLACE FUNCTION public.cancel_class_session(p_session_id uuid, p_reason text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_session record;
  v_teacher uuid;
  v_count integer;
BEGIN
  SELECT id, class_id INTO v_session FROM public.class_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT teacher_id INTO v_teacher FROM public.classes WHERE id = v_session.class_id;
  IF NOT (v_teacher = v_uid OR public.is_admin()) THEN
    RAISE EXCEPTION 'NOT_ALLOWED' USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.class_sessions SET status = 'cancelled' WHERE id = p_session_id;

  UPDATE public.bookings
  SET status = 'cancelled', cancelled_at = now(), cancelled_by = v_uid,
      cancel_reason = COALESCE(NULLIF(btrim(COALESCE(p_reason, '')), ''), 'session_cancelled')
  WHERE session_id = p_session_id AND status IN ('hold', 'pending_payment', 'confirmed');
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

-- ── 12. RPC: RESERVAS RECIBIDAS (panel del profesor) ─────────────────────────
-- Devuelve nombre del alumno (profiles de alumnos no son públicos), nunca su correo.
-- p_class_id NULL = todas las clases del profesor. Admin ve todas.

CREATE OR REPLACE FUNCTION public.list_teacher_bookings(p_class_id uuid DEFAULT NULL)
RETURNS TABLE (
  booking_id   uuid,
  class_id     uuid,
  class_title  text,
  session_id   uuid,
  session_date date,
  start_time   time,
  student_id   uuid,
  student_name text,
  seats        integer,
  status       text,
  price_amount numeric,
  currency     text,
  payment_method text,
  created_at   timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT b.id, b.class_id, c.title, b.session_id, s.session_date, s.start_time,
         b.user_id, COALESCE(p.name, 'Alumno'), b.seats, b.status, b.price_amount, b.currency,
         b.payment_method, b.created_at
  FROM public.bookings b
  JOIN public.classes c ON c.id = b.class_id
  LEFT JOIN public.class_sessions s ON s.id = b.session_id
  LEFT JOIN public.profiles p ON p.id = b.user_id
  WHERE (c.teacher_id = auth.uid() OR public.is_admin())
    AND (p_class_id IS NULL OR b.class_id = p_class_id)
  ORDER BY COALESCE(s.session_date, c.start_date) DESC NULLS LAST, b.created_at DESC;
$$;

-- ── 12b. RPC: FECHAS DISPONIBLES DE UNA CLASE (pública) ──────────────────────
-- Las reservas ajenas no son visibles (RLS), así que los cupos ocupados salen de aquí.

CREATE OR REPLACE FUNCTION public.list_class_sessions(p_class_id uuid)
RETURNS TABLE (
  id           uuid,
  session_date date,
  start_time   time,
  end_time     time,
  capacity     integer,
  taken        integer
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT s.id, s.session_date, s.start_time, s.end_time, s.capacity,
         COALESCE((
           SELECT SUM(b.seats)::integer FROM public.bookings b
           WHERE b.session_id = s.id
             AND b.status IN ('hold', 'pending_payment', 'confirmed', 'attended', 'no_show')
         ), 0)
  FROM public.class_sessions s
  JOIN public.classes c ON c.id = s.class_id
  WHERE s.class_id = p_class_id
    AND c.status = 'published'
    AND s.status = 'open'
    AND s.session_date >= (now() AT TIME ZONE 'America/Lima')::date
  ORDER BY s.session_date, s.start_time;
$$;

-- ── 13. PERMISOS DE EJECUCIÓN ────────────────────────────────────────────────
-- Postgres da EXECUTE a PUBLIC por defecto; cada RPC valida su autorización en el cuerpo.

REVOKE EXECUTE ON FUNCTION public.generate_class_sessions(uuid)        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reserve_booking(uuid, uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_booking(uuid, text)           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_booking_attendance(uuid, text)   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_class_session(uuid, text)     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_teacher_bookings(uuid)          FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.generate_class_sessions(uuid)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_booking(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid, text)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_booking_attendance(uuid, text)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_class_session(uuid, text)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_teacher_bookings(uuid)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_class_sessions(uuid)            TO anon, authenticated;
