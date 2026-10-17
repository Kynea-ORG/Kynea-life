-- 64. SUGERENCIAS DIARIAS DE BÚSQUEDA CON IA (daily_search_suggestions)
--
-- Almacena las sugerencias de búsqueda rápida y placeholders generados diariamente
-- por IA según las clases programadas para cada día.
-- Permite que la página principal sirva sugerencias dinámicas en 0ms sin llamadas
-- recurrentes a Gemini por cada visita o usuario.

CREATE TABLE IF NOT EXISTS public.daily_search_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_date date NOT NULL UNIQUE,
  weekday text NOT NULL,
  quick_prompts jsonb NOT NULL DEFAULT '[]'::jsonb,
  placeholders jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: Lectura pública de sugerencias generadas
ALTER TABLE public.daily_search_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_search_suggestions_select_public" ON public.daily_search_suggestions;
CREATE POLICY "daily_search_suggestions_select_public"
  ON public.daily_search_suggestions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- RPC con SECURITY DEFINER para guardar/actualizar sugerencias diarias de forma atómica y segura
CREATE OR REPLACE FUNCTION public.save_daily_search_suggestions(
  p_date date,
  p_weekday text,
  p_quick_prompts jsonb,
  p_placeholders jsonb
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
    updated_at
  ) VALUES (
    p_date,
    p_weekday,
    p_quick_prompts,
    p_placeholders,
    now()
  )
  ON CONFLICT (suggestion_date)
  DO UPDATE SET
    weekday = EXCLUDED.weekday,
    quick_prompts = EXCLUDED.quick_prompts,
    placeholders = EXCLUDED.placeholders,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT SELECT ON TABLE public.daily_search_suggestions TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_daily_search_suggestions(date, text, jsonb, jsonb) TO anon, authenticated;
