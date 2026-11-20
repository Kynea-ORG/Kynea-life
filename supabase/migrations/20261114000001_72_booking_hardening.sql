-- ============================================================
-- 72 — Reservas: endurecimiento tras la revisión de código
--
--  1. Política de cancelación aplicada en la base (cancel_booking), no solo en la interfaz.
--  2. classes.available_spots siempre coherente con las reservas (trigger en classes + relleno).
--  3. Fechas (class_sessions): se limpian las que ya no coinciden con el horario y un refresco
--     diario (cron) mantiene el horizonte de ~90 días.
--  4. Cola de correos con "claim" atómico (sin envíos duplicados entre acción y cron).
--  5. Reservas protegidas: no se borra una clase con reservas (RESTRICT) y no se cambia el modo
--     ni se bajan los cupos por debajo de lo reservado.
-- ============================================================

-- ── 1. POLÍTICA DE CANCELACIÓN EN cancel_booking ─────────────────────────────
-- El alumno solo cancela hasta N horas antes del inicio (flexible 24 h, moderada 48 h,
-- estricta 168 h). El profesor dueño y el admin cancelan siempre. Hora de Lima.

CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_booking record;
  v_class record;
  v_date date;
  v_time time;
  v_start timestamptz;
  v_hours integer;
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

  -- Plazo: solo se exige cuando cancela el propio alumno (no el profesor ni un admin).
  IF v_booking.user_id = v_uid AND v_class.teacher_id IS DISTINCT FROM v_uid AND NOT public.is_admin() THEN
    IF v_booking.session_id IS NOT NULL THEN
      SELECT session_date, start_time INTO v_date, v_time
        FROM public.class_sessions WHERE id = v_booking.session_id;
    ELSE
      v_date := v_class.start_date;
      SELECT start_time INTO v_time FROM public.class_schedules
        WHERE class_id = v_booking.class_id ORDER BY day_of_week, start_time LIMIT 1;
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

-- ── 2. available_spots COHERENTE ─────────────────────────────────────────────
-- · modo 'class': max_spots − cupos reservados (lo mantiene también el trigger de bookings).
-- · modo 'session': los cupos son de cada fecha, así que la clase muestra max_spots (> 0) para que
--   el filtro "con cupos" no la oculte; la disponibilidad real sale de list_class_sessions.
-- · modo 'none': lo calcula la app (igual que siempre).
-- Antes, subir max_spots no recalculaba nada y una clase "por fecha" quedaba con NULL.

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
      AND status IN ('hold', 'pending_payment', 'confirmed', 'attended', 'no_show');
    NEW.available_spots := GREATEST(NEW.max_spots - v_taken, 0);
  ELSIF NEW.booking_mode = 'session' THEN
    NEW.available_spots := NEW.max_spots;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS classes_keep_available_spots_trg ON public.classes;
CREATE TRIGGER classes_keep_available_spots_trg
  BEFORE INSERT OR UPDATE OF max_spots, booking_mode ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.classes_keep_available_spots();

-- Relleno de las clases que ya estaban en modo reserva (dispara el trigger con una asignación nula).
UPDATE public.classes SET max_spots = max_spots WHERE booking_mode IN ('class', 'session');

-- ── 3. FECHAS: LIMPIEZA Y REFRESCO ───────────────────────────────────────────
-- Lógica interna (sin chequeo de permisos): la usan generate_class_sessions (dueño/admin) y el
-- refresco diario (service role). Idempotente.

CREATE OR REPLACE FUNCTION public._refresh_class_sessions(p_class_id uuid)
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

  -- Fechas futuras SIN ninguna reserva que ya no coinciden con el horario (o quedan fuera del
  -- rango de la clase): se eliminan. Las que ya tienen reservas se conservan para que el profesor
  -- las cancele a mano (así cada alumno recibe su aviso).
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

  -- Las fechas futuras sin reservas toman el cupo actual de la clase (y el horario de fin).
  UPDATE public.class_sessions cs
  SET capacity = v_class.max_spots,
      end_time = COALESCE((
        SELECT s.end_time FROM public.class_schedules s
        WHERE s.class_id = p_class_id
          AND s.day_of_week = (EXTRACT(ISODOW FROM cs.session_date)::int - 1)
          AND s.start_time = cs.start_time
        LIMIT 1), cs.end_time)
  WHERE cs.class_id = p_class_id
    AND cs.session_date >= v_today
    AND NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.session_id = cs.id);

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_class_sessions(p_class_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_teacher uuid;
BEGIN
  SELECT teacher_id INTO v_teacher FROM public.classes WHERE id = p_class_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLASS_NOT_FOUND' USING ERRCODE = 'no_data_found';
  END IF;
  IF NOT (public.is_admin() OR v_teacher = auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ALLOWED' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public._refresh_class_sessions(p_class_id);
END;
$$;

-- Refresco diario (cron, service role): mantiene ~90 días de fechas por delante en toda clase
-- publicada "por fecha". Devuelve cuántas fechas nuevas creó.
CREATE OR REPLACE FUNCTION public.refresh_all_class_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_id uuid;
  v_total integer := 0;
BEGIN
  FOR v_id IN
    SELECT id FROM public.classes
    WHERE booking_mode = 'session' AND status = 'published'
      AND (end_date IS NULL OR end_date >= (now() AT TIME ZONE 'America/Lima')::date)
  LOOP
    v_total := v_total + public._refresh_class_sessions(v_id);
  END LOOP;
  RETURN v_total;
END;
$$;

-- ── 4. COLA DE CORREOS CON CLAIM ATÓMICO ─────────────────────────────────────

ALTER TABLE public.email_outbox ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
ALTER TABLE public.email_outbox DROP CONSTRAINT IF EXISTS email_outbox_status_check;
ALTER TABLE public.email_outbox
  ADD CONSTRAINT email_outbox_status_check CHECK (status IN ('pending', 'sending', 'sent', 'failed'));

-- Reclama hasta p_limit correos pendientes (o "sending" abandonados hace más de 10 minutos) y los
-- marca como `sending`. FOR UPDATE SKIP LOCKED: dos ejecuciones simultáneas nunca toman el mismo.
CREATE OR REPLACE FUNCTION public.claim_email_outbox(p_limit integer DEFAULT 25)
RETURNS TABLE (id uuid, to_email text, template text, payload jsonb, attempts integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  UPDATE public.email_outbox o
  SET status = 'sending', claimed_at = now()
  WHERE o.id IN (
    SELECT q.id FROM public.email_outbox q
    WHERE q.attempts < 5
      AND (q.status = 'pending' OR (q.status = 'sending' AND q.claimed_at < now() - interval '10 minutes'))
    ORDER BY q.created_at
    LIMIT GREATEST(COALESCE(p_limit, 25), 1)
    FOR UPDATE SKIP LOCKED
  )
  RETURNING o.id, o.to_email, o.template, o.payload, o.attempts;
$$;

-- ── 5. RESERVAS PROTEGIDAS ───────────────────────────────────────────────────

-- Borrar una clase ya no borra en silencio las reservas de los alumnos (ni su historial).
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_class_id_fkey;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_class_id_fkey
  FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE RESTRICT;

-- Las fechas con reservas tampoco se borran en cascada.
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_session_id_fkey;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES public.class_sessions(id) ON DELETE RESTRICT;

-- No se cambia el modo con reservas activas ni se bajan los cupos por debajo de lo reservado.
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
    WHERE class_id = NEW.id AND status IN ('hold', 'pending_payment', 'confirmed');
    IF v_active > 0 THEN
      RAISE EXCEPTION 'HAS_ACTIVE_BOOKINGS' USING ERRCODE = 'invalid_parameter_value';
    END IF;
  END IF;

  IF NEW.booking_mode = 'class' AND NEW.max_spots IS NOT NULL
     AND NEW.max_spots IS DISTINCT FROM OLD.max_spots THEN
    SELECT COALESCE(SUM(seats), 0) INTO v_taken FROM public.bookings
    WHERE class_id = NEW.id AND session_id IS NULL
      AND status IN ('hold', 'pending_payment', 'confirmed', 'attended', 'no_show');
    IF NEW.max_spots < v_taken THEN
      RAISE EXCEPTION 'CAPACITY_BELOW_BOOKINGS' USING ERRCODE = 'invalid_parameter_value';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS classes_guard_bookings_trg ON public.classes;
CREATE TRIGGER classes_guard_bookings_trg
  BEFORE UPDATE OF booking_mode, max_spots ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.classes_guard_bookings();

-- ── 6. PERMISOS DE EJECUCIÓN ─────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.cancel_booking(uuid, text)      FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.cancel_booking(uuid, text)      TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_class_sessions(uuid)   FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.generate_class_sessions(uuid)   TO authenticated;

-- Solo el servidor (service role) puede refrescar todas las fechas o reclamar correos.
REVOKE EXECUTE ON FUNCTION public._refresh_class_sessions(uuid)   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_all_class_sessions()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_email_outbox(integer)     FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public._refresh_class_sessions(uuid)   TO service_role;
GRANT  EXECUTE ON FUNCTION public.refresh_all_class_sessions()    TO service_role;
GRANT  EXECUTE ON FUNCTION public.claim_email_outbox(integer)     TO service_role;
