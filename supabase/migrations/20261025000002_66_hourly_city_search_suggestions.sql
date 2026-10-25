-- 66. SUGERENCIAS DE BÚSQUEDA PARTICIONADAS POR CIUDAD Y HORA (daily_search_suggestions)
--
-- Agrega soporte para particionar las sugerencias de búsqueda rápida y placeholders
-- según la ubicación (ciudad con clases presenciales o bucket 'Online') y la hora del día (0-23).
-- Permite servir sugerencias hiperlocales para Lima y virtuales/generales para otras
-- ciudades en 0ms y con caché hourly en PostgreSQL.

-- 1. Agregar columnas city y suggestion_hour con valores por defecto
ALTER TABLE public.daily_search_suggestions 
  ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT 'Lima',
  ADD COLUMN IF NOT EXISTS suggestion_hour integer NOT NULL DEFAULT 0;

-- 2. Eliminar constraint de unicidad anterior sobre suggestion_date si existe
ALTER TABLE public.daily_search_suggestions
  DROP CONSTRAINT IF EXISTS daily_search_suggestions_suggestion_date_key;

-- 3. Crear nuevo constraint de unicidad compuesto (city, suggestion_date, suggestion_hour)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_search_suggestions_city_date_hour_key'
  ) THEN
    ALTER TABLE public.daily_search_suggestions
      ADD CONSTRAINT daily_search_suggestions_city_date_hour_key UNIQUE (city, suggestion_date, suggestion_hour);
  END IF;
END $$;

-- 4. Reemplazar la función RPC save_daily_search_suggestions con soporte para p_city y p_hour
DROP FUNCTION IF EXISTS public.save_daily_search_suggestions(date, text, jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.save_daily_search_suggestions(
  p_date date,
  p_weekday text,
  p_quick_prompts jsonb,
  p_placeholders jsonb,
  p_city text DEFAULT 'Lima',
  p_hour integer DEFAULT 0
)
RETURNS public.daily_search_suggestions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_row public.daily_search_suggestions;
BEGIN
  INSERT INTO public.daily_search_suggestions (
    suggestion_date,
    weekday,
    quick_prompts,
    placeholders,
    city,
    suggestion_hour,
    updated_at
  ) VALUES (
    p_date,
    p_weekday,
    p_quick_prompts,
    p_placeholders,
    COALESCE(p_city, 'Lima'),
    COALESCE(p_hour, 0),
    now()
  )
  ON CONFLICT (city, suggestion_date, suggestion_hour)
  DO UPDATE SET
    weekday = EXCLUDED.weekday,
    quick_prompts = EXCLUDED.quick_prompts,
    placeholders = EXCLUDED.placeholders,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_daily_search_suggestions(date, text, jsonb, jsonb, text, integer) TO anon, authenticated;
