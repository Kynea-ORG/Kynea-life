-- ============================================================
-- 76 — Flujo de aprobación/confirmación de reservas (Fase 1.5)
--
--  1. classes.reminder_hours_before (1, 2, 4, 12, 24, 48; default 24):
--     ventana configurable por el profesor para recibir el recordatorio de
--     reservas pendientes de confirmación.
--  2. bookings: agrega estado 'pending_confirmation', columnas confirmed_at,
--     confirmed_by, student_whatsapp y student_instagram.
--     - Clases gratuitas (precio 0 / free) nacen 'confirmed'.
--     - Clases de pago nacen 'pending_confirmation' y SÍ ocupan cupo de inmediato.
--     - Mientras esté 'pending_confirmation', el alumno puede cancelar libremente
--       sin restricción de la política de cancelación.
--  3. booking_action_tokens: tokens opacos hasheados (SHA-256) solo service_role
--     para aprobar/liberar reservas en 1 tap desde el correo (vía POST).
--  4. Nuevas RPCs:
--     - confirm_booking(p_booking_id uuid): profesor dueño o admin, idempotente.
--     - expire_unconfirmed_bookings(p_grace_hours integer DEFAULT 48): service_role,
--       cierre silencioso a 'expired' tras 48h post-clase.
--  5. Actualización de reserve_booking, reserve_bookings, cancel_booking,
--     cancel_class_session, list_class_sessions, list_teacher_bookings,
--     sync_class_available_spots, classes_keep_available_spots,
--     classes_guard_bookings y _refresh_class_sessions.
-- ============================================================

-- ── 1. RECORDATORIO CONFIGURABLE EN CLASSES ──────────────────────────────────

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS reminder_hours_before smallint NOT NULL DEFAULT 24;

ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_reminder_hours_before_check;
ALTER TABLE public.classes
  ADD CONSTRAINT classes_reminder_hours_before_check
  CHECK (reminder_hours_before IN (1, 2, 4, 12, 24, 48));

-- ── 2. NUEVO ESTADO Y COLUMNAS EN BOOKINGS ───────────────────────────────────

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'hold',
    'pending_payment',
    'pending_confirmation',
    'confirmed',
    'cancelled',
    'expired',
    'attended',
    'no_show'
  ));

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS confirmed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS student_whatsapp  text,
  ADD COLUMN IF NOT EXISTS student_instagram text;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_student_whatsapp_len;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_student_whatsapp_len
  CHECK (student_whatsapp IS NULL OR char_length(student_whatsapp) <= 40);

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_student_instagram_len;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_student_instagram_len
  CHECK (student_instagram IS NULL OR char_length(student_instagram) <= 100);

-- Backfill idempotente para reservas ya confirmadas.
UPDATE public.bookings
SET confirmed_at = created_at
WHERE status = 'confirmed' AND confirmed_at IS NULL;

-- El índice único activo incluye 'pending_confirmation' (no existen filas previas en ese estado).
DROP INDEX IF EXISTS public.bookings_one_active_per_target_idx;
CREATE UNIQUE INDEX bookings_one_active_per_target_idx
  ON public.bookings (user_id, class_id, COALESCE(session_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status IN ('hold', 'pending_payment', 'pending_confirmation', 'confirmed');

CREATE INDEX IF NOT EXISTS bookings_pending_confirmation_idx
  ON public.bookings (class_id, session_id)
  WHERE status = 'pending_confirmation';

-- ── 3. TABLA DE TOKENS DE ACCIÓN 1-TAP (SOLO SERVICE ROLE) ──────────────────

CREATE TABLE IF NOT EXISTS public.booking_action_tokens (
  token_hash text PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_action_tokens_booking_idx
  ON public.booking_action_tokens (booking_id);
CREATE INDEX IF NOT EXISTS booking_action_tokens_expires_idx
  ON public.booking_action_tokens (expires_at);

ALTER TABLE public.booking_action_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_action_tokens FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.booking_action_tokens TO service_role;

-- ── 4. TRIGGERS DE CUPOS Y PROTECCIÓN (INCLUYE pending_confirmation) ────────

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
    AND status IN ('hold', 'pending_payment', 'pending_confirmation', 'confirmed', 'attended', 'no_show');

  UPDATE public.classes
  SET available_spots = GREATEST(max_spots - v_taken, 0)
  WHERE id = v_class_id
    AND booking_mode = 'class'
    AND max_spots IS NOT NULL;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.classes_keep_available_spots()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_taken integer;
BEGIN
  IF NEW.booking_mode = 'class' AND NEW.max_spots IS NOT NULL THEN
    SELECT COALESCE(SUM(seats), 0) INTO v_taken
    FROM public.bookings
    WHERE class_id = NEW.id AND session_id IS NULL
      AND status IN ('hold', 'pending_payment', 'pending_confirmation', 'confirmed', 'attended', 'no_show');
    NEW.available_spots := GREATEST(NEW.max_spots - v_taken, 0);
  ELSIF NEW.booking_mode = 'session' THEN
    NEW.available_spots := NEW.max_spots;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.classes_guard_bookings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_active integer;
  v_taken integer;
BEGIN
  IF NEW.booking_mode IS DISTINCT FROM OLD.booking_mode THEN
    SELECT COUNT(*) INTO v_active FROM public.bookings
    WHERE class_id = NEW.id
      AND status IN ('hold', 'pending_payment', 'pending_confirmation', 'confirmed');
    IF v_active > 0 THEN
      RAISE EXCEPTION 'HAS_ACTIVE_BOOKINGS' USING ERRCODE = 'invalid_parameter_value';
    END IF;
  END IF;

  IF NEW.booking_mode = 'class' AND NEW.max_spots IS NOT NULL
     AND NEW.max_spots IS DISTINCT FROM OLD.max_spots THEN
    SELECT COALESCE(SUM(seats), 0) INTO v_taken FROM public.bookings
    WHERE class_id = NEW.id AND session_id IS NULL
      AND status IN ('hold', 'pending_payment', 'pending_confirmation', 'confirmed', 'attended', 'no_show');
    IF NEW.max_spots < v_taken THEN
      RAISE EXCEPTION 'CAPACITY_BELOW_BOOKINGS' USING ERRCODE = 'invalid_parameter_value';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public._refresh_class_sessions(p_class_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_class record;
  v_today date := (now() AT TIME ZONE 'America/Lima')::date;
  v_from  date;
  v_to    date;
  v_count integer;
BEGIN
  SELECT id, booking_mode, start_date, end_date, max_spots
    INTO v_class FROM public.classes WHERE id = p_class_id;
  IF NOT FOUND OR v_class.booking_mode <> 'session' THEN
    RETURN 0;
  END IF;

  v_from := GREATEST(COALESCE(v_class.start_date, v_today), v_today);
  v_to   := LEAST(COALESCE(v_class.end_date, v_from + 90), v_from + 120);

  INSERT INTO public.class_sessions (class_id, session_date, start_time, end_time, capacity)
  SELECT p_class_id, d::date, s.start_time, s.end_time, v_class.max_spots
  FROM generate_series(v_from, v_to, interval '1 day') AS d
  JOIN public.class_schedules s
    ON s.class_id = p_class_id
   AND s.day_of_week = (EXTRACT(ISODOW FROM d)::int - 1)
  ON CONFLICT (class_id, session_date, start_time) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  DELETE FROM public.class_sessions cs
  WHERE cs.class_id = p_class_id
    AND cs.session_date >= v_today
    AND NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.session_id = cs.id)
    AND (
      NOT EXISTS (
        SELECT 1 FROM public.class_schedules s
        WHERE s.class_id = p_class_id
          AND s.day_of_week = (EXTRACT(ISODOW FROM cs.session_date)::int - 1)
          AND s.start_time = cs.start_time
      )
      OR (v_class.start_date IS NOT NULL AND cs.session_date < v_class.start_date)
      OR (v_class.end_date   IS NOT NULL AND cs.session_date > v_class.end_date)
    );

  UPDATE public.class_sessions cs
  SET status = 'cancelled'
  WHERE cs.class_id = p_class_id
    AND cs.status = 'open'
    AND cs.session_date >= v_today
    AND NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.session_id = cs.id
        AND b.status IN ('hold', 'pending_payment', 'pending_confirmation', 'confirmed')
    )
    AND (
      NOT EXISTS (
        SELECT 1 FROM public.class_schedules s
        WHERE s.class_id = p_class_id
          AND s.day_of_week = (EXTRACT(ISODOW FROM cs.session_date)::int - 1)
          AND s.start_time = cs.start_time
      )
      OR (v_class.start_date IS NOT NULL AND cs.session_date < v_class.start_date)
      OR (v_class.end_date   IS NOT NULL AND cs.session_date > v_class.end_date)
    );

  UPDATE public.class_sessions cs
  SET capacity = v_class.max_spots,
      end_time = COALESCE((
        SELECT s.end_time FROM public.class_schedules s
        WHERE s.class_id = p_class_id
          AND s.day_of_week = (EXTRACT(ISODOW FROM cs.session_date)::int - 1)
          AND s.start_time = cs.start_time
        LIMIT 1), cs.end_time)
  WHERE cs.class_id = p_class_id
    AND cs.status = 'open'
    AND cs.session_date >= v_today
    AND NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.session_id = cs.id
        AND b.status IN ('hold', 'pending_payment', 'pending_confirmation', 'confirmed', 'attended', 'no_show')
    );

  RETURN v_count;
END;
$$;

-- ── 5. RPC: list_class_sessions (INCLUYE pending_confirmation) ──────────────

CREATE OR REPLACE FUNCTION public.list_class_sessions(p_class_id uuid)
RETURNS TABLE (
  id             uuid,
  session_date   date,
  start_time     time,
  end_time       time,
  capacity       integer,
  taken          integer,
  already_booked boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT s.id,
         s.session_date,
         s.start_time,
         s.end_time,
         s.capacity,
         COALESCE((
           SELECT SUM(b.seats)::integer
           FROM public.bookings b
           WHERE b.session_id = s.id
             AND b.status IN ('hold', 'pending_payment', 'pending_confirmation', 'confirmed', 'attended', 'no_show')
         ), 0),
         CASE
           WHEN auth.uid() IS NULL THEN false
           ELSE EXISTS (
             SELECT 1
             FROM public.bookings ub
             WHERE ub.user_id = auth.uid()
               AND ub.class_id = p_class_id
               AND ub.session_id = s.id
               AND ub.status IN ('hold', 'pending_payment', 'pending_confirmation', 'confirmed', 'attended', 'no_show')
           )
         END
  FROM public.class_sessions s
  JOIN public.classes c ON c.id = s.class_id
  WHERE s.class_id = p_class_id
    AND c.status = 'published'
    AND c.booking_mode = 'session'
    AND s.status = 'open'
    AND ((s.session_date + s.start_time) AT TIME ZONE 'America/Lima') > now()
  ORDER BY s.session_date, s.start_time;
$$;

-- ── 6. RPC: reserve_booking (GRATIS -> confirmed, PAGO -> pending_confirmation)

DROP FUNCTION IF EXISTS public.reserve_booking(uuid, uuid, integer, text);

CREATE OR REPLACE FUNCTION public.reserve_booking(
  p_class_id   uuid,
  p_session_id uuid    DEFAULT NULL,
  p_seats      integer DEFAULT 1,
  p_note       text    DEFAULT NULL,
  p_whatsapp   text    DEFAULT NULL,
  p_instagram  text    DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid           uuid := auth.uid();
  v_today         date := (now() AT TIME ZONE 'America/Lima')::date;
  v_class         record;
  v_session       record;
  v_profile       record;
  v_start_time    time;
  v_capacity      integer;
  v_taken         integer;
  v_unit          numeric(10,2);
  v_total         numeric(10,2);
  v_status        text;
  v_confirmed_at  timestamptz;
  v_wa            text;
  v_ig            text;
  v_id            uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_seats IS NULL OR p_seats < 1 OR p_seats > 10 THEN
    RAISE EXCEPTION 'INVALID_SEATS' USING ERRCODE = 'invalid_parameter_value';
  END IF;

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
    IF v_class.start_date IS NOT NULL THEN
      v_start_time := public._class_initial_start_time(p_class_id, v_class.start_date);
      IF v_start_time IS NOT NULL THEN
        IF ((v_class.start_date + v_start_time) AT TIME ZONE 'America/Lima') <= now() THEN
          RAISE EXCEPTION 'PAST_DATE' USING ERRCODE = 'invalid_parameter_value';
        END IF;
      ELSIF v_class.start_date < v_today THEN
        RAISE EXCEPTION 'PAST_DATE' USING ERRCODE = 'invalid_parameter_value';
      END IF;
    ELSIF v_class.end_date IS NOT NULL AND v_class.end_date < v_today THEN
      RAISE EXCEPTION 'PAST_DATE' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    v_capacity := v_class.max_spots;
  ELSE
    SELECT id, session_date, start_time, capacity, status INTO v_session
      FROM public.class_sessions WHERE id = p_session_id AND class_id = p_class_id FOR UPDATE;
    IF NOT FOUND OR v_session.status <> 'open' THEN
      RAISE EXCEPTION 'SESSION_NOT_FOUND' USING ERRCODE = 'no_data_found';
    END IF;
    IF ((v_session.session_date + v_session.start_time) AT TIME ZONE 'America/Lima') <= now() THEN
      RAISE EXCEPTION 'PAST_DATE' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    v_capacity := v_session.capacity;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE user_id = v_uid AND class_id = p_class_id
      AND session_id IS NOT DISTINCT FROM p_session_id
      AND status IN ('hold', 'pending_payment', 'pending_confirmation', 'confirmed', 'attended', 'no_show')
  ) THEN
    RAISE EXCEPTION 'ALREADY_BOOKED' USING ERRCODE = 'unique_violation';
  END IF;

  SELECT COALESCE(SUM(seats), 0) INTO v_taken
  FROM public.bookings
  WHERE class_id = p_class_id
    AND session_id IS NOT DISTINCT FROM p_session_id
    AND status IN ('hold', 'pending_payment', 'pending_confirmation', 'confirmed', 'attended', 'no_show');

  IF v_capacity IS NOT NULL AND v_taken + p_seats > v_capacity THEN
    RAISE EXCEPTION 'SOLD_OUT' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT whatsapp, instagram INTO v_profile FROM public.profiles WHERE id = v_uid;
  v_wa := COALESCE(NULLIF(left(btrim(COALESCE(p_whatsapp, '')), 40), ''), NULLIF(btrim(COALESCE(v_profile.whatsapp, '')), ''));
  v_ig := COALESCE(NULLIF(left(btrim(COALESCE(p_instagram, '')), 100), ''), NULLIF(btrim(COALESCE(v_profile.instagram, '')), ''));

  IF v_wa IS NOT NULL OR v_ig IS NOT NULL THEN
    UPDATE public.profiles
    SET whatsapp  = COALESCE(NULLIF(btrim(whatsapp), ''), v_wa),
        instagram = COALESCE(NULLIF(btrim(instagram), ''), v_ig)
    WHERE id = v_uid
      AND (
        (v_wa IS NOT NULL AND NULLIF(btrim(COALESCE(whatsapp, '')), '') IS NULL)
        OR (v_ig IS NOT NULL AND NULLIF(btrim(COALESCE(instagram, '')), '') IS NULL)
      );
  END IF;

  v_unit := CASE
    WHEN v_class.price_type = 'Gratis' THEN 0
    ELSE COALESCE(NULLIF(v_class.offer_price, 0), v_class.price, 0)
  END;
  v_total := v_unit * p_seats;

  IF v_total = 0 THEN
    v_status := 'confirmed';
    v_confirmed_at := now();
  ELSE
    v_status := 'pending_confirmation';
    v_confirmed_at := NULL;
  END IF;

  INSERT INTO public.bookings (
    user_id, class_id, session_id, status, confirmed_at, seats,
    price_amount, currency, payment_method, student_note,
    student_whatsapp, student_instagram
  )
  VALUES (
    v_uid, p_class_id, p_session_id, v_status, v_confirmed_at, p_seats,
    v_total, COALESCE(v_class.currency, 'PEN'),
    CASE WHEN v_total = 0 THEN 'free' ELSE 'pay_at_venue' END,
    NULLIF(left(btrim(COALESCE(p_note, '')), 500), ''),
    v_wa, v_ig
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ── 7. RPC: reserve_bookings (MULTI-SESIÓN CON MISMA REGLA) ─────────────────

DROP FUNCTION IF EXISTS public.reserve_bookings(uuid, uuid[], integer, text);

CREATE OR REPLACE FUNCTION public.reserve_bookings(
  p_class_id    uuid,
  p_session_ids uuid[]  DEFAULT NULL,
  p_seats       integer DEFAULT 1,
  p_note        text    DEFAULT NULL,
  p_whatsapp    text    DEFAULT NULL,
  p_instagram   text    DEFAULT NULL
)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid           uuid := auth.uid();
  v_today         date := (now() AT TIME ZONE 'America/Lima')::date;
  v_class         record;
  v_session       record;
  v_profile       record;
  v_start_time    time;
  v_taken         integer;
  v_unit          numeric(10,2);
  v_total         numeric(10,2);
  v_currency      text;
  v_payment       text;
  v_status        text;
  v_confirmed_at  timestamptz;
  v_clean_note    text;
  v_wa            text;
  v_ig            text;
  v_id            uuid;
  v_unique_ids    uuid[];
  v_found         integer := 0;
  v_session_id    uuid;
  v_created_ids   uuid[] := ARRAY[]::uuid[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_seats IS NULL OR p_seats < 1 OR p_seats > 10 THEN
    RAISE EXCEPTION 'INVALID_SEATS' USING ERRCODE = 'invalid_parameter_value';
  END IF;

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

  SELECT whatsapp, instagram INTO v_profile FROM public.profiles WHERE id = v_uid;
  v_wa := COALESCE(NULLIF(left(btrim(COALESCE(p_whatsapp, '')), 40), ''), NULLIF(btrim(COALESCE(v_profile.whatsapp, '')), ''));
  v_ig := COALESCE(NULLIF(left(btrim(COALESCE(p_instagram, '')), 100), ''), NULLIF(btrim(COALESCE(v_profile.instagram, '')), ''));

  IF v_wa IS NOT NULL OR v_ig IS NOT NULL THEN
    UPDATE public.profiles
    SET whatsapp  = COALESCE(NULLIF(btrim(whatsapp), ''), v_wa),
        instagram = COALESCE(NULLIF(btrim(instagram), ''), v_ig)
    WHERE id = v_uid
      AND (
        (v_wa IS NOT NULL AND NULLIF(btrim(COALESCE(whatsapp, '')), '') IS NULL)
        OR (v_ig IS NOT NULL AND NULLIF(btrim(COALESCE(instagram, '')), '') IS NULL)
      );
  END IF;

  v_unit := CASE
    WHEN v_class.price_type = 'Gratis' THEN 0
    ELSE COALESCE(NULLIF(v_class.offer_price, 0), v_class.price, 0)
  END;
  v_total      := v_unit * p_seats;
  v_currency   := COALESCE(v_class.currency, 'PEN');
  v_payment    := CASE WHEN v_total = 0 THEN 'free' ELSE 'pay_at_venue' END;
  v_status     := CASE WHEN v_total = 0 THEN 'confirmed' ELSE 'pending_confirmation' END;
  v_confirmed_at := CASE WHEN v_total = 0 THEN now() ELSE NULL END;
  v_clean_note := NULLIF(left(btrim(COALESCE(p_note, '')), 500), '');

  IF v_class.booking_mode = 'class' THEN
    IF p_session_ids IS NOT NULL AND COALESCE(array_length(p_session_ids, 1), 0) > 0 THEN
      RAISE EXCEPTION 'CLASS_NOT_BOOKABLE' USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF v_class.start_date IS NOT NULL THEN
      v_start_time := public._class_initial_start_time(p_class_id, v_class.start_date);
      IF v_start_time IS NOT NULL THEN
        IF ((v_class.start_date + v_start_time) AT TIME ZONE 'America/Lima') <= now() THEN
          RAISE EXCEPTION 'PAST_DATE' USING ERRCODE = 'invalid_parameter_value';
        END IF;
      ELSIF v_class.start_date < v_today THEN
        RAISE EXCEPTION 'PAST_DATE' USING ERRCODE = 'invalid_parameter_value';
      END IF;
    ELSIF v_class.end_date IS NOT NULL AND v_class.end_date < v_today THEN
      RAISE EXCEPTION 'PAST_DATE' USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.bookings
      WHERE user_id = v_uid AND class_id = p_class_id AND session_id IS NULL
        AND status IN ('hold', 'pending_payment', 'pending_confirmation', 'confirmed', 'attended', 'no_show')
    ) THEN
      RAISE EXCEPTION 'ALREADY_BOOKED' USING ERRCODE = 'unique_violation';
    END IF;

    SELECT COALESCE(SUM(seats), 0) INTO v_taken
    FROM public.bookings
    WHERE class_id = p_class_id AND session_id IS NULL
      AND status IN ('hold', 'pending_payment', 'pending_confirmation', 'confirmed', 'attended', 'no_show');

    IF v_class.max_spots IS NOT NULL AND v_taken + p_seats > v_class.max_spots THEN
      RAISE EXCEPTION 'SOLD_OUT' USING ERRCODE = 'invalid_parameter_value';
    END IF;

    INSERT INTO public.bookings (
      user_id, class_id, session_id, status, confirmed_at, seats,
      price_amount, currency, payment_method, student_note,
      student_whatsapp, student_instagram
    )
    VALUES (
      v_uid, p_class_id, NULL, v_status, v_confirmed_at, p_seats,
      v_total, v_currency, v_payment, v_clean_note,
      v_wa, v_ig
    )
    RETURNING id INTO v_id;

    RETURN ARRAY[v_id];
  END IF;

  IF p_session_ids IS NULL OR COALESCE(array_length(p_session_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND' USING ERRCODE = 'no_data_found';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_session_ids) AS x WHERE x IS NULL) THEN
    RAISE EXCEPTION 'INVALID_SESSIONS' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT array_agg(DISTINCT x ORDER BY x) INTO v_unique_ids FROM unnest(p_session_ids) AS x;
  IF array_length(v_unique_ids, 1) <> array_length(p_session_ids, 1)
     OR array_length(v_unique_ids, 1) > 20 THEN
    RAISE EXCEPTION 'INVALID_SESSIONS' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  FOR v_session IN
    SELECT id, session_date, start_time, capacity, status
    FROM public.class_sessions
    WHERE class_id = p_class_id
      AND id = ANY(v_unique_ids)
    ORDER BY id
    FOR UPDATE
  LOOP
    v_found := v_found + 1;
    IF v_session.status <> 'open' THEN
      RAISE EXCEPTION 'SESSION_NOT_FOUND' USING ERRCODE = 'no_data_found';
    END IF;
    IF ((v_session.session_date + v_session.start_time) AT TIME ZONE 'America/Lima') <= now() THEN
      RAISE EXCEPTION 'PAST_DATE' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.bookings
      WHERE user_id = v_uid
        AND class_id = p_class_id
        AND session_id = v_session.id
        AND status IN ('hold', 'pending_payment', 'pending_confirmation', 'confirmed', 'attended', 'no_show')
    ) THEN
      RAISE EXCEPTION 'ALREADY_BOOKED' USING ERRCODE = 'unique_violation';
    END IF;

    SELECT COALESCE(SUM(seats), 0) INTO v_taken
    FROM public.bookings
    WHERE class_id = p_class_id
      AND session_id = v_session.id
      AND status IN ('hold', 'pending_payment', 'pending_confirmation', 'confirmed', 'attended', 'no_show');

    IF v_session.capacity IS NOT NULL AND v_taken + p_seats > v_session.capacity THEN
      RAISE EXCEPTION 'SOLD_OUT' USING ERRCODE = 'invalid_parameter_value';
    END IF;
  END LOOP;

  IF v_found <> array_length(v_unique_ids, 1) THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND' USING ERRCODE = 'no_data_found';
  END IF;

  FOR v_session_id IN
    SELECT x FROM unnest(p_session_ids) WITH ORDINALITY AS t(x, ord) ORDER BY ord
  LOOP
    INSERT INTO public.bookings (
      user_id, class_id, session_id, status, confirmed_at, seats,
      price_amount, currency, payment_method, student_note,
      student_whatsapp, student_instagram
    )
    VALUES (
      v_uid, p_class_id, v_session_id, v_status, v_confirmed_at, p_seats,
      v_total, v_currency, v_payment, v_clean_note,
      v_wa, v_ig
    )
    RETURNING id INTO v_id;
    v_created_ids := array_append(v_created_ids, v_id);
  END LOOP;

  RETURN v_created_ids;
END;
$$;

-- ── 8. RPC: cancel_booking (CANCELACIÓN LIBRE SI pending_confirmation) ──────

CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_booking record;
  v_class   record;
  v_date    date;
  v_time    time;
  v_start   timestamptz;
  v_hours   integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT b.id, b.user_id, b.class_id, b.session_id, b.status INTO v_booking
    FROM public.bookings b WHERE b.id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT teacher_id, cancellation_policy, start_date INTO v_class
    FROM public.classes WHERE id = v_booking.class_id;
  IF NOT (v_booking.user_id = v_uid OR v_class.teacher_id = v_uid OR public.is_admin()) THEN
    RAISE EXCEPTION 'NOT_ALLOWED' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_booking.status NOT IN ('hold', 'pending_payment', 'pending_confirmation', 'confirmed') THEN
    RAISE EXCEPTION 'NOT_CANCELLABLE' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- La política de cancelación solo aplica cuando el alumno cancela una reserva YA confirmada.
  -- Mientras está en 'pending_confirmation' el alumno puede cancelar libremente.
  IF v_booking.status <> 'pending_confirmation'
     AND v_booking.user_id = v_uid
     AND v_class.teacher_id IS DISTINCT FROM v_uid
     AND NOT public.is_admin() THEN
    IF v_booking.session_id IS NOT NULL THEN
      SELECT session_date, start_time INTO v_date, v_time
        FROM public.class_sessions WHERE id = v_booking.session_id;
    ELSE
      v_date := v_class.start_date;
      v_time := public._class_initial_start_time(v_booking.class_id, v_class.start_date);
    END IF;

    IF v_date IS NOT NULL THEN
      v_start := ((v_date + COALESCE(v_time, time '00:00')) AT TIME ZONE 'America/Lima');
      v_hours := CASE v_class.cancellation_policy
                   WHEN 'flexible' THEN 24
                   WHEN 'estricta' THEN 168
                   ELSE 48
                 END;
      IF now() > v_start - make_interval(hours => v_hours) THEN
        RAISE EXCEPTION 'CANCEL_WINDOW_CLOSED' USING ERRCODE = 'invalid_parameter_value';
      END IF;
    END IF;
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled', cancelled_at = now(), cancelled_by = v_uid,
      cancel_reason = NULLIF(btrim(COALESCE(p_reason, '')), '')
  WHERE id = p_booking_id;
END;
$$;

-- ── 9. RPC: cancel_class_session (INCLUYE pending_confirmation) ─────────────

CREATE OR REPLACE FUNCTION public.cancel_class_session(p_session_id uuid, p_reason text DEFAULT NULL)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid           uuid := auth.uid();
  v_class_id      uuid;
  v_teacher       uuid;
  v_session       record;
  v_cancelled_ids uuid[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT class_id INTO v_class_id FROM public.class_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT teacher_id INTO v_teacher FROM public.classes WHERE id = v_class_id FOR UPDATE;
  IF NOT (v_teacher = v_uid OR public.is_admin()) THEN
    RAISE EXCEPTION 'NOT_ALLOWED' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT id, status INTO v_session FROM public.class_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND' USING ERRCODE = 'no_data_found';
  END IF;
  IF v_session.status = 'cancelled' THEN
    RETURN ARRAY[]::uuid[];
  END IF;

  UPDATE public.class_sessions SET status = 'cancelled' WHERE id = p_session_id;

  WITH updated AS (
    UPDATE public.bookings
    SET status = 'cancelled', cancelled_at = now(), cancelled_by = v_uid,
        cancel_reason = COALESCE(NULLIF(btrim(COALESCE(p_reason, '')), ''), 'session_cancelled')
    WHERE session_id = p_session_id
      AND status IN ('hold', 'pending_payment', 'pending_confirmation', 'confirmed')
    RETURNING id
  )
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_cancelled_ids FROM updated;

  RETURN v_cancelled_ids;
END;
$$;

-- ── 10. RPC: confirm_booking (PROFESOR O ADMIN, IDEMPOTENTE) ────────────────

CREATE OR REPLACE FUNCTION public.confirm_booking(p_booking_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_booking record;
  v_teacher uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = 'insufficient_privilege';
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

  IF v_booking.status = 'confirmed' THEN
    RETURN false;
  END IF;

  IF v_booking.status <> 'pending_confirmation' THEN
    RAISE EXCEPTION 'NOT_CONFIRMABLE' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE public.bookings
  SET status = 'confirmed',
      confirmed_at = now(),
      confirmed_by = v_uid
  WHERE id = p_booking_id;

  RETURN true;
END;
$$;

-- ── 11. RPC: expire_unconfirmed_bookings (CIERRE SILENCIOSO +48H POST-CLASE) ─

CREATE OR REPLACE FUNCTION public.expire_unconfirmed_bookings(p_grace_hours integer DEFAULT 48)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_hours integer := GREATEST(COALESCE(p_grace_hours, 48), 1);
  v_count integer := 0;
BEGIN
  WITH candidates AS (
    SELECT b.id
    FROM public.bookings b
    JOIN public.classes c ON c.id = b.class_id
    LEFT JOIN public.class_sessions s ON s.id = b.session_id
    WHERE b.status = 'pending_confirmation'
      AND (
        (
          b.session_id IS NOT NULL
          AND ((s.session_date + COALESCE(s.end_time, s.start_time)) AT TIME ZONE 'America/Lima')
              + make_interval(hours => v_hours) <= now()
        )
        OR (
          b.session_id IS NULL
          AND COALESCE(c.end_date, c.start_date) IS NOT NULL
          AND ((COALESCE(c.end_date, c.start_date) + COALESCE(public._class_initial_start_time(c.id, c.start_date), time '23:59')) AT TIME ZONE 'America/Lima')
              + make_interval(hours => v_hours) <= now()
        )
      )
  )
  UPDATE public.bookings b
  SET status = 'expired'
  FROM candidates
  WHERE b.id = candidates.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ── 12. RPC: list_teacher_bookings (INCLUYE student_whatsapp Y confirmed_at) ─

DROP FUNCTION IF EXISTS public.list_teacher_bookings(uuid, boolean);

CREATE OR REPLACE FUNCTION public.list_teacher_bookings(
  p_class_id    uuid    DEFAULT NULL,
  p_include_all boolean DEFAULT false
)
RETURNS TABLE (
  booking_id        uuid,
  class_id          uuid,
  class_title       text,
  class_modality    text,
  class_end_date    date,
  session_id        uuid,
  session_date      date,
  session_status    text,
  start_time        time,
  capacity          integer,
  student_id        uuid,
  student_name      text,
  student_photo     text,
  student_bio       text,
  student_whatsapp  text,
  student_instagram text,
  student_since     timestamptz,
  student_note      text,
  student_prior     integer,
  seats             integer,
  status            text,
  confirmed_at      timestamptz,
  price_amount      numeric,
  currency          text,
  payment_method    text,
  created_at        timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT b.id, b.class_id, c.title, c.modality, c.end_date, b.session_id,
         COALESCE(s.session_date, c.start_date),
         s.status,
         COALESCE(s.start_time, public._class_initial_start_time(c.id, c.start_date)),
         COALESCE(s.capacity, c.max_spots),
         b.user_id, COALESCE(p.name, 'Alumno'), p.photo_url, p.bio,
         COALESCE(NULLIF(btrim(b.student_whatsapp), ''), NULLIF(btrim(p.whatsapp), '')),
         COALESCE(NULLIF(btrim(b.student_instagram), ''), NULLIF(btrim(p.instagram), '')),
         p.created_at, b.student_note,
         (SELECT COUNT(*)::integer
            FROM public.bookings pb
            JOIN public.classes pc ON pc.id = pb.class_id
            LEFT JOIN public.class_sessions ps ON ps.id = pb.session_id
           WHERE pb.user_id = b.user_id
             AND pc.teacher_id = c.teacher_id
             AND pb.id <> b.id
             AND (
               pb.status = 'attended'
               OR (
                 pb.status = 'confirmed'
                 AND COALESCE(ps.session_date, pc.end_date, pc.start_date) < (now() AT TIME ZONE 'America/Lima')::date
               )
             )),
         b.seats, b.status, b.confirmed_at, b.price_amount, b.currency, b.payment_method, b.created_at
  FROM public.bookings b
  JOIN public.classes c ON c.id = b.class_id
  LEFT JOIN public.class_sessions s ON s.id = b.session_id
  LEFT JOIN public.profiles p ON p.id = b.user_id
  WHERE (c.teacher_id = auth.uid() OR (COALESCE(p_include_all, false) AND public.is_admin()))
    AND (p_class_id IS NULL OR b.class_id = p_class_id)
  ORDER BY COALESCE(s.session_date, c.start_date) DESC NULLS LAST, b.created_at DESC;
$$;

-- ── 13. PERMISOS DE EJECUCIÓN ────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.reserve_booking(uuid, uuid, integer, text, text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.reserve_booking(uuid, uuid, integer, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.reserve_bookings(uuid, uuid[], integer, text, text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.reserve_bookings(uuid, uuid[], integer, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.cancel_booking(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.cancel_booking(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.cancel_class_session(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.cancel_class_session(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.confirm_booking(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.confirm_booking(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.expire_unconfirmed_bookings(integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.expire_unconfirmed_bookings(integer) TO service_role;

REVOKE ALL ON FUNCTION public.list_teacher_bookings(uuid, boolean) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.list_teacher_bookings(uuid, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.list_class_sessions(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.list_class_sessions(uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public._refresh_class_sessions(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public._refresh_class_sessions(uuid) TO service_role;
