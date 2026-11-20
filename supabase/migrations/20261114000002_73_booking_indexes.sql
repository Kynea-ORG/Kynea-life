-- ============================================================
-- 73 — Índices para el cron diario de reservas
-- Los recordatorios buscan reservas por fecha de la sesión (class_sessions.session_date) o por
-- inicio de la clase (classes.start_date) sin filtrar antes por clase: sin estos índices cada
-- ejecución recorrería ambas tablas completas. email_outbox(sent_at) acelera el borrado de
-- correos enviados hace más de 60 días.
-- ============================================================

CREATE INDEX IF NOT EXISTS class_sessions_date_idx ON public.class_sessions (session_date);

CREATE INDEX IF NOT EXISTS classes_start_date_booking_idx
  ON public.classes (start_date)
  WHERE booking_mode <> 'none';

CREATE INDEX IF NOT EXISTS email_outbox_sent_at_idx
  ON public.email_outbox (sent_at)
  WHERE status = 'sent';
