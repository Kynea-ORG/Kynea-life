-- ============================================================================
-- Migración 78: Control explícito de guardado de contacto en perfil (opt-in/out)
-- Agrega p_save_contact (DEFAULT true) a reserve_booking y reserve_bookings
-- para que el alumno decida si guarda el contacto ingresado en su perfil para
-- futuras reservas.
-- ============================================================================

DROP FUNCTION IF EXISTS public.reserve_booking(uuid, uuid, integer, text, text, text);

CREATE OR REPLACE FUNCTION public.reserve_booking(
  p_class_id   uuid,
  p_session_id uuid    DEFAULT NULL,
  p_seats      integer DEFAULT 1,
  p_note       text    DEFAULT NULL,
  p_whatsapp     text    DEFAULT NULL,
  p_instagram    text    DEFAULT NULL,
  p_save_contact boolean DEFAULT true
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

  IF COALESCE(p_save_contact, true) AND (v_wa IS NOT NULL OR v_ig IS NOT NULL) THEN
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

DROP FUNCTION IF EXISTS public.reserve_bookings(uuid, uuid[], integer, text, text, text);

CREATE OR REPLACE FUNCTION public.reserve_bookings(
  p_class_id    uuid,
  p_session_ids uuid[]  DEFAULT NULL,
  p_seats       integer DEFAULT 1,
  p_note        text    DEFAULT NULL,
  p_whatsapp     text    DEFAULT NULL,
  p_instagram    text    DEFAULT NULL,
  p_save_contact boolean DEFAULT true
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

  IF COALESCE(p_save_contact, true) AND (v_wa IS NOT NULL OR v_ig IS NOT NULL) THEN
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

REVOKE ALL ON FUNCTION public.reserve_booking(uuid, uuid, integer, text, text, text, boolean) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.reserve_booking(uuid, uuid, integer, text, text, text, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.reserve_bookings(uuid, uuid[], integer, text, text, text, boolean) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.reserve_bookings(uuid, uuid[], integer, text, text, text, boolean) TO authenticated;
