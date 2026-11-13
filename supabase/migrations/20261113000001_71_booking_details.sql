-- ── 71. RESERVAS: NOTA DEL ALUMNO Y FICHA DEL ALUMNO PARA EL PROFESOR ──────────
-- · bookings.student_note: mensaje opcional del alumno al profesor (nivel, lesiones, dudas).
-- · reserve_booking recibe p_note.
-- · list_teacher_bookings devuelve también la ficha pública del alumno (foto, bio,
--   Instagram, antigüedad), cuántas veces ha reservado con este profesor y el cupo total de la
--   fecha. Nunca devuelve correo ni teléfono.

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS student_note text
  CHECK (student_note IS NULL OR char_length(student_note) <= 500);

DROP FUNCTION IF EXISTS public.reserve_booking(uuid, uuid, integer);

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

  INSERT INTO public.bookings (user_id, class_id, session_id, status, seats, price_amount, currency, payment_method, student_note)
  VALUES (
    v_uid, p_class_id, p_session_id, 'confirmed', p_seats, v_total, v_class.currency,
    CASE WHEN v_total = 0 THEN 'free' ELSE 'pay_at_venue' END,
    NULLIF(left(btrim(COALESCE(p_note, '')), 500), '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_booking(uuid, uuid, integer, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.reserve_booking(uuid, uuid, integer, text) TO authenticated;

DROP FUNCTION IF EXISTS public.list_teacher_bookings(uuid);

CREATE OR REPLACE FUNCTION public.list_teacher_bookings(p_class_id uuid DEFAULT NULL)
RETURNS TABLE (
  booking_id      uuid,
  class_id        uuid,
  class_title     text,
  session_id      uuid,
  session_date    date,
  start_time      time,
  capacity        integer,
  student_id      uuid,
  student_name    text,
  student_photo   text,
  student_bio     text,
  student_instagram text,
  student_since   timestamptz,
  student_note    text,
  student_prior   integer,
  seats           integer,
  status          text,
  price_amount    numeric,
  currency        text,
  payment_method  text,
  created_at      timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT b.id, b.class_id, c.title, b.session_id,
         COALESCE(s.session_date, c.start_date),
         COALESCE(s.start_time, (SELECT cs.start_time FROM public.class_schedules cs
                                  WHERE cs.class_id = c.id ORDER BY cs.day_of_week LIMIT 1)),
         COALESCE(s.capacity, c.max_spots),
         b.user_id, COALESCE(p.name, 'Alumno'), p.photo_url, p.bio, p.instagram,
         p.created_at, b.student_note,
         (SELECT COUNT(*)::integer FROM public.bookings pb
            JOIN public.classes pc ON pc.id = pb.class_id
           WHERE pb.user_id = b.user_id AND pc.teacher_id = c.teacher_id
             AND pb.id <> b.id AND pb.status IN ('confirmed', 'attended', 'no_show')),
         b.seats, b.status, b.price_amount, b.currency, b.payment_method, b.created_at
  FROM public.bookings b
  JOIN public.classes c ON c.id = b.class_id
  LEFT JOIN public.class_sessions s ON s.id = b.session_id
  LEFT JOIN public.profiles p ON p.id = b.user_id
  WHERE (c.teacher_id = auth.uid() OR public.is_admin())
    AND (p_class_id IS NULL OR b.class_id = p_class_id)
  ORDER BY COALESCE(s.session_date, c.start_date) DESC NULLS LAST, b.created_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.list_teacher_bookings(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.list_teacher_bookings(uuid) TO authenticated;
