-- ============================================================
-- 75 — Reservas múltiples de fechas en una sola operación atómica
--
--  1. list_class_sessions(p_class_id): agrega already_booked boolean para que la UI
--     deshabilite fechas donde el usuario autenticado ya tiene una reserva activa o registrada.
--  2. reserve_bookings(p_class_id, p_session_ids, p_seats, p_note): RPC atómica que permite
--     reservar 1 o varias fechas (hasta 20) de una clase semanal en una sola transacción
--     (todo o nada), bloqueando classes y luego class_sessions en orden determinístico por id
--     para evitar deadlocks.
--  3. reserve_booking(...) existente se mantiene intacta por compatibilidad.
-- ============================================================

-- ── 1. RPC: FECHAS DISPONIBLES CON INDICADOR already_booked ──────────────────

DROP FUNCTION IF EXISTS public.list_class_sessions(uuid);

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
             AND b.status IN ('hold', 'pending_payment', 'confirmed', 'attended', 'no_show')
         ), 0),
         CASE
           WHEN auth.uid() IS NULL THEN false
           ELSE EXISTS (
             SELECT 1
             FROM public.bookings ub
             WHERE ub.user_id = auth.uid()
               AND ub.class_id = p_class_id
               AND ub.session_id = s.id
               AND ub.status IN ('hold', 'pending_payment', 'confirmed', 'attended', 'no_show')
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

REVOKE ALL ON FUNCTION public.list_class_sessions(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.list_class_sessions(uuid) TO anon, authenticated;

-- ── 2. RPC: RESERVAR UNA O VARIAS FECHAS DE FORMA ATÓMICA ────────────────────

CREATE OR REPLACE FUNCTION public.reserve_bookings(
  p_class_id    uuid,
  p_session_ids uuid[]  DEFAULT NULL,
  p_seats       integer DEFAULT 1,
  p_note        text    DEFAULT NULL
)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid         uuid := auth.uid();
  v_today       date := (now() AT TIME ZONE 'America/Lima')::date;
  v_class       record;
  v_session     record;
  v_start_time  time;
  v_taken       integer;
  v_unit        numeric(10,2);
  v_total       numeric(10,2);
  v_currency    text;
  v_payment     text;
  v_clean_note  text;
  v_id          uuid;
  v_unique_ids  uuid[];
  v_found       integer := 0;
  v_session_id  uuid;
  v_created_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_seats IS NULL OR p_seats < 1 OR p_seats > 10 THEN
    RAISE EXCEPTION 'INVALID_SEATS' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Bloquea la clase primero: mismo orden de bloqueo que reserve_booking y cancel_class_session.
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

  v_unit := CASE
    WHEN v_class.price_type = 'Gratis' THEN 0
    ELSE COALESCE(NULLIF(v_class.offer_price, 0), v_class.price, 0)
  END;
  v_total      := v_unit * p_seats;
  v_currency   := COALESCE(v_class.currency, 'PEN');
  v_payment    := CASE WHEN v_total = 0 THEN 'free' ELSE 'pay_at_venue' END;
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
        AND status IN ('hold', 'pending_payment', 'confirmed', 'attended', 'no_show')
    ) THEN
      RAISE EXCEPTION 'ALREADY_BOOKED' USING ERRCODE = 'unique_violation';
    END IF;

    SELECT COALESCE(SUM(seats), 0) INTO v_taken
    FROM public.bookings
    WHERE class_id = p_class_id AND session_id IS NULL
      AND status IN ('hold', 'pending_payment', 'confirmed', 'attended', 'no_show');

    IF v_class.max_spots IS NOT NULL AND v_taken + p_seats > v_class.max_spots THEN
      RAISE EXCEPTION 'SOLD_OUT' USING ERRCODE = 'invalid_parameter_value';
    END IF;

    INSERT INTO public.bookings (user_id, class_id, session_id, status, seats, price_amount, currency, payment_method, student_note)
    VALUES (v_uid, p_class_id, NULL, 'confirmed', p_seats, v_total, v_currency, v_payment, v_clean_note)
    RETURNING id INTO v_id;

    RETURN ARRAY[v_id];
  END IF;

  -- Modo 'session': exige al menos 1 fecha, sin nulos, sin duplicados y máximo 20 fechas.
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

  -- Bloquea y valida todas las sesiones en orden determinístico (evita deadlocks).
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
        AND status IN ('hold', 'pending_payment', 'confirmed', 'attended', 'no_show')
    ) THEN
      RAISE EXCEPTION 'ALREADY_BOOKED' USING ERRCODE = 'unique_violation';
    END IF;

    SELECT COALESCE(SUM(seats), 0) INTO v_taken
    FROM public.bookings
    WHERE class_id = p_class_id
      AND session_id = v_session.id
      AND status IN ('hold', 'pending_payment', 'confirmed', 'attended', 'no_show');

    IF v_session.capacity IS NOT NULL AND v_taken + p_seats > v_session.capacity THEN
      RAISE EXCEPTION 'SOLD_OUT' USING ERRCODE = 'invalid_parameter_value';
    END IF;
  END LOOP;

  IF v_found <> array_length(v_unique_ids, 1) THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND' USING ERRCODE = 'no_data_found';
  END IF;

  -- Inserta todas atómicamente respetando el orden solicitado (1:1 con p_session_ids).
  FOR v_session_id IN
    SELECT x FROM unnest(p_session_ids) WITH ORDINALITY AS t(x, ord) ORDER BY ord
  LOOP
    INSERT INTO public.bookings (user_id, class_id, session_id, status, seats, price_amount, currency, payment_method, student_note)
    VALUES (v_uid, p_class_id, v_session_id, 'confirmed', p_seats, v_total, v_currency, v_payment, v_clean_note)
    RETURNING id INTO v_id;
    v_created_ids := array_append(v_created_ids, v_id);
  END LOOP;

  RETURN v_created_ids;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_bookings(uuid, uuid[], integer, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.reserve_bookings(uuid, uuid[], integer, text) TO authenticated;
