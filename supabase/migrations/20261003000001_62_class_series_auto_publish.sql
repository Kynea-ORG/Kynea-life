-- ── 62. SERIES DE CLASES + PUBLICACIÓN AUTOMÁTICA ─────────────────────────
-- Un profesor que repite su clase Mensual en otros meses del año marca esos meses
-- en el wizard de "Crear clase"; Kynea crea una copia independiente por mes, en
-- borrador, vinculada por `series_id`. Cada copia se publica sola 14 días antes de
-- su inicio (`auto_publish_at` = start_date − 14) mediante un job diario de pg_cron.
--
-- La publicación pasa por el mismo UPDATE de siempre, así que el trigger
-- `protect_class_publish` (migración 59) sigue exigiendo WhatsApp/Instagram del
-- perfil y academia aprobada: si falla, la copia queda en borrador, el motivo se
-- guarda en `auto_publish_error` (una sola vez, para avisar una vez) y se reintenta
-- al día siguiente hasta que la clase termine.

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS series_id           uuid,
  ADD COLUMN IF NOT EXISTS auto_publish_at     date,
  ADD COLUMN IF NOT EXISTS auto_published_at   timestamptz,
  ADD COLUMN IF NOT EXISTS auto_publish_error  text;

COMMENT ON COLUMN public.classes.series_id IS
  'Agrupa la clase original y sus copias mensuales. NULL = clase suelta.';
COMMENT ON COLUMN public.classes.auto_publish_at IS
  'Fecha (hora de Lima) desde la cual el job diario publica esta copia en borrador. NULL = no se publica sola.';
COMMENT ON COLUMN public.classes.auto_published_at IS
  'Momento en que el job la publicó automáticamente (para avisar al profesor).';
COMMENT ON COLUMN public.classes.auto_publish_error IS
  'Motivo del primer intento fallido de publicación automática (ej. falta WhatsApp). Se limpia al publicarse.';

CREATE INDEX IF NOT EXISTS classes_series_idx ON public.classes (series_id) WHERE series_id IS NOT NULL;

-- El job solo mira borradores con fecha de publicación: índice parcial pequeño.
CREATE INDEX IF NOT EXISTS classes_auto_publish_idx
  ON public.classes (auto_publish_at)
  WHERE status = 'draft' AND auto_publish_at IS NOT NULL;

-- Publica las copias cuya fecha de publicación ya llegó. Devuelve cuántas publicó.
CREATE OR REPLACE FUNCTION public.publish_due_series_copies()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today     date := (now() AT TIME ZONE 'America/Lima')::date;
  v_class_id  uuid;
  v_published integer := 0;
BEGIN
  FOR v_class_id IN
    SELECT id
    FROM public.classes
    WHERE status = 'draft'
      AND auto_publish_at IS NOT NULL
      AND auto_publish_at <= v_today
      AND (end_date IS NULL OR end_date >= v_today)
    ORDER BY auto_publish_at, id
  LOOP
    -- Cada clase en su propio bloque: si el trigger protect_class_publish rechaza una
    -- (perfil incompleto, academia sin aprobar), no se cae el job para las demás.
    BEGIN
      UPDATE public.classes
      SET status             = 'published',
          published_at       = now(),
          auto_published_at  = now(),
          auto_publish_at    = NULL,
          auto_publish_error = NULL
      WHERE id = v_class_id;
      v_published := v_published + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.classes
      SET auto_publish_error = COALESCE(auto_publish_error, SQLERRM)
      WHERE id = v_class_id;
    END;
  END LOOP;

  RETURN v_published;
END;
$$;

-- Solo el job (rol postgres) y el service role la ejecutan; nunca un usuario de la app.
REVOKE ALL ON FUNCTION public.publish_due_series_copies() FROM PUBLIC, anon, authenticated;

-- Job diario: 11:00 UTC = 06:00 en Lima (UTC−5, sin horario de verano).
-- Si pg_cron no está disponible en el proyecto, esta migración falla a propósito:
-- sin el job la función existiría pero las copias nunca se publicarían solas.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'publish-series-copies';
  PERFORM cron.schedule(
    'publish-series-copies',
    '0 11 * * *',
    'SELECT public.publish_due_series_copies()'
  );
END;
$$;
