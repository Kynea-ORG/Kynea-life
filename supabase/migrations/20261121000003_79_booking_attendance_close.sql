-- ============================================================
-- 79 — Cierre ligero de asistencia ("Por cerrar"), corte por end_time y guarda vigente
--
--  1. _class_effective_end_time(p_class_id, p_end_date):
--     Devuelve la hora de fin efectiva del último bloque horario de la fecha final
--     de una clase en modo 'class'.
--  2. list_teacher_bookings(p_class_id, p_include_all):
--     Incluye end_time (de class_sessions.end_time o _class_effective_end_time)
--     para mover clases a "Por cerrar" al terminar su horario en America/Lima,
--     y student_no_shows (inasistencias previas registradas con este profesor/academia)
--     junto con student_prior (asistencias previas registradas con este profesor/academia).
--  3. set_booking_attendance(p_booking_id, p_status):
--     Acepta 'confirmed', 'attended' y 'no_show' (permite deshacer un 'no_show'
--     marcado por error volviendo a 'confirmed' o 'attended'), e impide marcar
--     'no_show' antes de que termine el horario de la clase (end_time en America/Lima;
--     fallback: start_time + 1h, o día posterior si no hay horario).
--  4. close_class_attendance(p_class_id, p_session_id DEFAULT NULL):
--     RPC atómica para el botón 1-clic "Confirmar que los demás asistieron":
--     pasa todas las reservas 'confirmed' de esa clase o sesión a 'attended'
--     y devuelve cuántas filas actualizó.
--  4b. bulk_set_booking_attendance(p_booking_ids uuid[], p_status text):
--     RPC atómica para corregir asistencia en bloque desde "Historial"
--     ('attended' o 'no_show'), validando dueño y cierre de horario vía set_booking_attendance.
--  5. auto_close_past_bookings(p_grace_hours DEFAULT 48):
--     RPC atómica para el cron horario: cuando pasaron p_grace_hours (48h) desde el fin
--     real de la sesión/clase en America/Lima, cierra toda la clase en un paso:
--     pending_confirmation -> expired y confirmed -> attended.
--  6. classes_guard_bookings():
--     Cuenta como activas solo reservas vigentes (fecha efectiva >= hoy Lima
--     o sin fecha) en estados hold/pending_payment/pending_confirmation/confirmed,
--     evitando que clases antiguas con historial bloqueen editar booking_mode.
-- ============================================================

-- ── 1. HELPER: HORA DE FIN EFECTIVA DE UNA CLASE SEGÚN end_date / start_date ─

CREATE OR REPLACE FUNCTION public._class_effective_end_time(
  p_class_id uuid,
  p_end_date date DEFAULT NULL
)
RETURNS time
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT cs.end_time
  FROM public.class_schedules cs
  WHERE cs.class_id = p_class_id
  ORDER BY
    CASE
      WHEN p_end_date IS NOT NULL AND cs.day_of_week = (EXTRACT(ISODOW FROM p_end_date)::int - 1)
      THEN 0
      ELSE 1
    END,
    cs.day_of_week DESC,
    cs.end_time DESC
  LIMIT 1;
$$;

-- ── 2. RPC: list_teacher_bookings (INCLUYE end_time) ─────────────────────────

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
  end_time          time,
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
  student_no_shows  integer,
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
         COALESCE(s.end_time, public._class_effective_end_time(c.id, COALESCE(c.end_date, c.start_date))),
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
         (SELECT COUNT(*)::integer
            FROM public.bookings pb
            JOIN public.classes pc ON pc.id = pb.class_id
           WHERE pb.user_id = b.user_id
             AND pc.teacher_id = c.teacher_id
             AND pb.id <> b.id
             AND pb.status = 'no_show'),
         b.seats, b.status, b.confirmed_at, b.price_amount, b.currency, b.payment_method, b.created_at
  FROM public.bookings b
  JOIN public.classes c ON c.id = b.class_id
  LEFT JOIN public.class_sessions s ON s.id = b.session_id
  LEFT JOIN public.profiles p ON p.id = b.user_id
  WHERE (c.teacher_id = auth.uid() OR (COALESCE(p_include_all, false) AND public.is_admin()))
    AND (p_class_id IS NULL OR b.class_id = p_class_id)
  ORDER BY COALESCE(s.session_date, c.start_date) DESC NULLS LAST, b.created_at DESC;
$$;

-- ── 3. RPC: set_booking_attendance (REVERSIÓN + CORTE EN end_time LIMA) ─────

CREATE OR REPLACE FUNCTION public.set_booking_attendance(p_booking_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_today      date := (now() AT TIME ZONE 'America/Lima')::date;
  v_booking    record;
  v_class      record;
  v_date       date;
  v_start_time time;
  v_end_time   time;
  v_end_ts     timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_status NOT IN ('confirmed', 'attended', 'no_show') THEN
    RAISE EXCEPTION 'INVALID_STATUS' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT b.id, b.class_id, b.session_id, b.status INTO v_booking
    FROM public.bookings b WHERE b.id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT teacher_id, start_date, end_date INTO v_class
    FROM public.classes WHERE id = v_booking.class_id;
  IF NOT (v_class.teacher_id = v_uid OR public.is_admin()) THEN
    RAISE EXCEPTION 'NOT_ALLOWED' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_booking.status NOT IN ('confirmed', 'attended', 'no_show') THEN
    RAISE EXCEPTION 'NOT_CANCELLABLE' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_status = 'no_show' THEN
    IF v_booking.session_id IS NOT NULL THEN
      SELECT session_date, start_time, end_time
        INTO v_date, v_start_time, v_end_time
        FROM public.class_sessions
       WHERE id = v_booking.session_id;
    ELSE
      v_date := COALESCE(v_class.end_date, v_class.start_date);
      v_start_time := public._class_initial_start_time(v_booking.class_id, v_date);
      v_end_time := public._class_effective_end_time(v_booking.class_id, v_date);
    END IF;

    IF v_date IS NOT NULL THEN
      IF v_end_time IS NOT NULL THEN
        v_end_ts := ((v_date + v_end_time) AT TIME ZONE 'America/Lima')
          + CASE
              WHEN v_start_time IS NOT NULL AND v_end_time < v_start_time THEN interval '1 day'
              ELSE interval '0'
            END;
        IF now() < v_end_ts THEN
          RAISE EXCEPTION 'FUTURE_DATE' USING ERRCODE = 'invalid_parameter_value';
        END IF;
      ELSIF v_start_time IS NOT NULL THEN
        v_end_ts := ((v_date + v_start_time) AT TIME ZONE 'America/Lima') + interval '1 hour';
        IF now() < v_end_ts THEN
          RAISE EXCEPTION 'FUTURE_DATE' USING ERRCODE = 'invalid_parameter_value';
        END IF;
      ELSIF v_date >= v_today THEN
        RAISE EXCEPTION 'FUTURE_DATE' USING ERRCODE = 'invalid_parameter_value';
      END IF;
    END IF;
  END IF;

  UPDATE public.bookings SET status = p_status WHERE id = p_booking_id;
END;
$$;

-- ── 4. RPC: close_class_attendance (CIERRE EN 1 CLIC POR CLASE O SESIÓN) ────

CREATE OR REPLACE FUNCTION public.close_class_attendance(
  p_class_id   uuid,
  p_session_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_teacher uuid;
  v_count   integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT teacher_id INTO v_teacher FROM public.classes WHERE id = p_class_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLASS_NOT_FOUND' USING ERRCODE = 'no_data_found';
  END IF;
  IF NOT (v_teacher = v_uid OR public.is_admin()) THEN
    RAISE EXCEPTION 'NOT_ALLOWED' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_session_id IS NOT NULL THEN
    PERFORM 1 FROM public.class_sessions
      WHERE id = p_session_id AND class_id = p_class_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'SESSION_NOT_FOUND' USING ERRCODE = 'no_data_found';
    END IF;
  END IF;

  UPDATE public.bookings
  SET status = 'attended'
  WHERE class_id = p_class_id
    AND session_id IS NOT DISTINCT FROM p_session_id
    AND status = 'confirmed';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ── 4b. RPC: bulk_set_booking_attendance (CORRECCIÓN MASIVA EN HISTORIAL) ──

CREATE OR REPLACE FUNCTION public.bulk_set_booking_attendance(
  p_booking_ids uuid[],
  p_status      text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_id    uuid;
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_status NOT IN ('attended', 'no_show') THEN
    RAISE EXCEPTION 'INVALID_STATUS' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF p_booking_ids IS NULL OR array_length(p_booking_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  FOR v_id IN
    SELECT DISTINCT id FROM unnest(p_booking_ids) AS id WHERE id IS NOT NULL
  LOOP
    PERFORM public.set_booking_attendance(v_id, p_status);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ── 5. RPC: auto_close_past_bookings (CIERRE AUTOMÁTICO +48H POST-CLASE) ────

CREATE OR REPLACE FUNCTION public.auto_close_past_bookings(
  p_grace_hours integer DEFAULT 48
)
RETURNS TABLE (
  expired_count  integer,
  attended_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_hours    integer := GREATEST(COALESCE(p_grace_hours, 48), 1);
  v_expired  integer := 0;
  v_attended integer := 0;
BEGIN
  WITH class_end_calc AS (
    SELECT
      b.id,
      b.status,
      CASE
        WHEN b.session_id IS NOT NULL AND s.session_date IS NOT NULL THEN
          CASE
            WHEN s.end_time IS NOT NULL THEN
              ((s.session_date + s.end_time) AT TIME ZONE 'America/Lima')
              + CASE
                  WHEN s.start_time IS NOT NULL AND s.end_time < s.start_time THEN interval '1 day'
                  ELSE interval '0'
                END
            WHEN s.start_time IS NOT NULL THEN
              ((s.session_date + s.start_time) AT TIME ZONE 'America/Lima') + interval '1 hour'
            ELSE
              ((s.session_date + time '23:59') AT TIME ZONE 'America/Lima')
          END
        WHEN b.session_id IS NULL AND COALESCE(c.end_date, c.start_date) IS NOT NULL THEN
          (
            SELECT
              CASE
                WHEN et IS NOT NULL THEN
                  ((COALESCE(c.end_date, c.start_date) + et) AT TIME ZONE 'America/Lima')
                  + CASE
                      WHEN st IS NOT NULL AND et < st THEN interval '1 day'
                      ELSE interval '0'
                    END
                WHEN st IS NOT NULL THEN
                  ((COALESCE(c.end_date, c.start_date) + st) AT TIME ZONE 'America/Lima') + interval '1 hour'
                ELSE
                  ((COALESCE(c.end_date, c.start_date) + time '23:59') AT TIME ZONE 'America/Lima')
              END
            FROM (
              SELECT
                public._class_effective_end_time(c.id, COALESCE(c.end_date, c.start_date)) AS et,
                public._class_initial_start_time(c.id, COALESCE(c.end_date, c.start_date)) AS st
            ) times
          )
        ELSE NULL
      END AS effective_end_ts
    FROM public.bookings b
    JOIN public.classes c ON c.id = b.class_id
    LEFT JOIN public.class_sessions s ON s.id = b.session_id
    WHERE b.status IN ('pending_confirmation', 'confirmed')
  ),
  due AS (
    SELECT id, status
    FROM class_end_calc
    WHERE effective_end_ts IS NOT NULL
      AND effective_end_ts + make_interval(hours => v_hours) <= now()
  ),
  updated AS (
    UPDATE public.bookings b
    SET status = CASE WHEN due.status = 'pending_confirmation' THEN 'expired' ELSE 'attended' END
    FROM due
    WHERE b.id = due.id
    RETURNING b.status
  )
  SELECT
    COUNT(*) FILTER (WHERE status = 'expired')::integer,
    COUNT(*) FILTER (WHERE status = 'attended')::integer
  INTO v_expired, v_attended
  FROM updated;

  RETURN QUERY SELECT COALESCE(v_expired, 0), COALESCE(v_attended, 0);
END;
$$;

-- ── 6. TRIGGER: classes_guard_bookings (SOLO RESERVAS VIGENTES >= HOY LIMA) ─

CREATE OR REPLACE FUNCTION public.classes_guard_bookings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_today  date := (now() AT TIME ZONE 'America/Lima')::date;
  v_active integer;
  v_taken  integer;
BEGIN
  IF NEW.booking_mode IS DISTINCT FROM OLD.booking_mode THEN
    SELECT COUNT(*) INTO v_active
    FROM public.bookings b
    LEFT JOIN public.class_sessions s ON s.id = b.session_id
    WHERE b.class_id = NEW.id
      AND b.status IN ('hold', 'pending_payment', 'pending_confirmation', 'confirmed')
      AND (
        COALESCE(s.session_date, OLD.end_date, OLD.start_date) IS NULL
        OR COALESCE(s.session_date, OLD.end_date, OLD.start_date) >= v_today
      );
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

-- ── 7. PERMISOS DE EJECUCIÓN ────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public._class_effective_end_time(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public._class_effective_end_time(uuid, date) TO service_role;

REVOKE ALL ON FUNCTION public.auto_close_past_bookings(integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.auto_close_past_bookings(integer) TO service_role;

REVOKE ALL ON FUNCTION public.list_teacher_bookings(uuid, boolean) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.list_teacher_bookings(uuid, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.set_booking_attendance(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.set_booking_attendance(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.close_class_attendance(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.close_class_attendance(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.bulk_set_booking_attendance(uuid[], text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.bulk_set_booking_attendance(uuid[], text) TO authenticated;
