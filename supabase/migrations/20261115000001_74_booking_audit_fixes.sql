-- ============================================================
-- 74 — Auditoría de reservas: correcciones de seguridad, concurrencia y reglas
--
--  1. Corte exacto en start_time (hora Lima) en list_class_sessions y reserve_booking.
--     En cursos multi-día (booking_mode = 'class') el corte se aplica en start_date + start_time.
--  2. Horario inicial coherente por día de inicio (_class_initial_start_time) compartido por
--     reserve_booking, cancel_booking y list_teacher_bookings.
--  3. list_teacher_bookings: en cuenta normal un admin solo ve sus propias clases; vista global
--     solo cuando p_include_all = true AND is_admin(). Devuelve también class_end_date,
--     session_status y corrige student_prior (solo historial real, sin futuras ni no_show).
--  4. cancel_class_session: bloquea classes FOR UPDATE antes que class_sessions (mismo orden que
--     reserve_booking) y devuelve uuid[] con los booking_id efectivamente cancelados.
--  5. _refresh_class_sessions: cancela sesiones futuras fuera de horario que solo tienen reservas
--     canceladas (evita sesiones fantasma) y actualiza cupo/horario cuando no hay cupos ocupados.
--  6. bookings_sync_available_spots cubre también DELETE (ON DELETE CASCADE de auth.users).
--  7. reserve_booking impide volver a reservar una sesión/clase donde ya existe registro
--     attended/no_show (serializado vía classes FOR UPDATE, sin alterar filas históricas).
--  8. list_class_sessions exige c.booking_mode = 'session'.
--  9. claim_email_outbox incrementa attempts en el claim atómico (evita bucles poison-pill).
-- ============================================================

-- ── 1. HELPER: HORA DE INICIO REAL DE UNA CLASE SEGÚN start_date ─────────────

CREATE OR REPLACE FUNCTION public._class_initial_start_time(
  p_class_id   uuid,
  p_start_date date DEFAULT NULL
)
RETURNS time
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT cs.start_time
  FROM public.class_schedules cs
  WHERE cs.class_id = p_class_id
  ORDER BY
    CASE
      WHEN p_start_date IS NOT NULL AND cs.day_of_week = (EXTRACT(ISODOW FROM p_start_date)::int - 1)
      THEN 0
      ELSE 1
    END,
    cs.day_of_week,
    cs.start_time
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public._class_initial_start_time(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public._class_initial_start_time(uuid, date) TO service_role;

-- ── 2. TRIGGER DE CUPOS (INCLUYE DELETE) ────────────────────────────────────

DROP TRIGGER IF EXISTS bookings_sync_available_spots ON public.bookings;
CREATE TRIGGER bookings_sync_available_spots
  AFTER INSERT OR UPDATE OF status, seats OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_class_available_spots();

-- ── 3. RPC: FECHAS DISPONIBLES DE UNA CLASE (CORTE EN start_time + booking_mode) ─

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
    AND c.booking_mode = 'session'
    AND s.status = 'open'
    AND ((s.session_date + s.start_time) AT TIME ZONE 'America/Lima') > now()
  ORDER BY s.session_date, s.start_time;
$$;

-- ── 4. RPC: RESERVAR (CORTE EXACTO start_time + LOCK CONSISTENTE + CURRENCY) ─

CREATE OR REPLACE FUNCTION public.reserve_booking(
  p_class_id   uuid,
  p_session_id uuid DEFAULT NULL,
  p_seats      integer DEFAULT 1,
  p_note       text    DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_today      date := (now() AT TIME ZONE 'America/Lima')::date;
  v_class      record;
  v_session    record;
  v_start_time time;
  v_capacity   integer;
  v_taken      integer;
  v_unit       numeric(10,2);
  v_total      numeric(10,2);
  v_id         uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_seats IS NULL OR p_seats < 1 OR p_seats > 10 THEN
    RAISE EXCEPTION 'INVALID_SEATS' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Bloquea la clase primero: mismo orden de bloqueo que cancel_class_session.
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
      AND status IN ('hold', 'pending_payment', 'confirmed', 'attended', 'no_show')
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

  INSERT INTO public.bookings (user_id, class_id, session_id, status, seats, price_amount, currency, payment_method, student_note)
  VALUES (
    v_uid, p_class_id, p_session_id, 'confirmed', p_seats, v_total, COALESCE(v_class.currency, 'PEN'),
    CASE WHEN v_total = 0 THEN 'free' ELSE 'pay_at_venue' END,
    NULLIF(left(btrim(COALESCE(p_note, '')), 500), '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ── 5. RPC: CANCELAR RESERVA (HORA REAL DEL DÍA DE INICIO) ───────────────────

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
  IF v_booking.status NOT IN ('hold', 'pending_payment', 'confirmed') THEN
    RAISE EXCEPTION 'NOT_CANCELLABLE' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_booking.user_id = v_uid AND v_class.teacher_id IS DISTINCT FROM v_uid AND NOT public.is_admin() THEN
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

-- ── 6. RPC: CANCELAR FECHA (ATÓMICA, SIN RACE CONDITION, RETORNA uuid[]) ────

DROP FUNCTION IF EXISTS public.cancel_class_session(uuid, text);

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

  -- Bloquea classes ANTES que class_sessions: mismo orden que reserve_booking.
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
    WHERE session_id = p_session_id AND status IN ('hold', 'pending_payment', 'confirmed')
    RETURNING id
  )
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_cancelled_ids FROM updated;

  RETURN v_cancelled_ids;
END;
$$;

-- ── 7. REFRESCO DE SESIONES (SIN SESIONES FANTASMA) ──────────────────────────

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
   AND s.day_of_week = (EXTRACT(ISODOW FROM d)::int - 1)   -- 0 = Lunes
  ON CONFLICT (class_id, session_date, start_time) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- 1) Sesiones futuras fuera de horario/rango SIN ningún historial: se eliminan.
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

  -- 2) Sesiones futuras fuera de horario/rango CON historial cancelado/expirado pero SIN reservas
  --    activas: no se pueden borrar (FK RESTRICT), así que se marcan cancelled para no quedar open.
  UPDATE public.class_sessions cs
  SET status = 'cancelled'
  WHERE cs.class_id = p_class_id
    AND cs.status = 'open'
    AND cs.session_date >= v_today
    AND NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.session_id = cs.id
        AND b.status IN ('hold', 'pending_payment', 'confirmed')
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

  -- 3) Sesiones futuras abiertas sin cupos ocupados toman el cupo y hora de fin actuales.
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
        AND b.status IN ('hold', 'pending_payment', 'confirmed', 'attended', 'no_show')
    );

  RETURN v_count;
END;
$$;

-- ── 8. RPC: RESERVAS RECIBIDAS (AISLAMIENTO ADMIN + session_status + end_date) ─

DROP FUNCTION IF EXISTS public.list_teacher_bookings(uuid);

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
  student_instagram text,
  student_since     timestamptz,
  student_note      text,
  student_prior     integer,
  seats             integer,
  status            text,
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
         b.user_id, COALESCE(p.name, 'Alumno'), p.photo_url, p.bio, p.instagram,
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
         b.seats, b.status, b.price_amount, b.currency, b.payment_method, b.created_at
  FROM public.bookings b
  JOIN public.classes c ON c.id = b.class_id
  LEFT JOIN public.class_sessions s ON s.id = b.session_id
  LEFT JOIN public.profiles p ON p.id = b.user_id
  WHERE (c.teacher_id = auth.uid() OR (COALESCE(p_include_all, false) AND public.is_admin()))
    AND (p_class_id IS NULL OR b.class_id = p_class_id)
  ORDER BY COALESCE(s.session_date, c.start_date) DESC NULLS LAST, b.created_at DESC;
$$;

-- ── 9. COLA DE CORREOS: CLAIM ATÓMICO INCREMENTANDO attempts (ANTI POISON-PILL) ─

CREATE OR REPLACE FUNCTION public.claim_email_outbox(p_limit integer DEFAULT 25)
RETURNS TABLE (id uuid, to_email text, template text, payload jsonb, attempts integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Marca como fallidos los correos que ya agotaron sus 5 intentos y quedaron abandonados.
  UPDATE public.email_outbox
  SET status = 'failed',
      claimed_at = NULL,
      last_error = COALESCE(last_error, 'Máximo de reintentos alcanzado tras abandono')
  WHERE status = 'sending'
    AND attempts >= 5
    AND claimed_at < now() - interval '10 minutes';

  RETURN QUERY
  UPDATE public.email_outbox o
  SET status = 'sending',
      claimed_at = now(),
      attempts = o.attempts + 1
  WHERE o.id IN (
    SELECT q.id FROM public.email_outbox q
    WHERE q.attempts < 5
      AND (q.status = 'pending' OR (q.status = 'sending' AND q.claimed_at < now() - interval '10 minutes'))
    ORDER BY q.created_at
    LIMIT GREATEST(COALESCE(p_limit, 25), 1)
    FOR UPDATE SKIP LOCKED
  )
  RETURNING o.id, o.to_email, o.template, o.payload, o.attempts;
END;
$$;

-- ── 10. PERMISOS DE EJECUCIÓN ────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.reserve_booking(uuid, uuid, integer, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.reserve_booking(uuid, uuid, integer, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cancel_booking(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.cancel_booking(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cancel_class_session(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.cancel_class_session(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.list_teacher_bookings(uuid, boolean) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.list_teacher_bookings(uuid, boolean) TO authenticated;

GRANT  EXECUTE ON FUNCTION public.list_class_sessions(uuid) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public._refresh_class_sessions(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public._refresh_class_sessions(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.claim_email_outbox(integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.claim_email_outbox(integer) TO service_role;
