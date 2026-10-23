-- ── 63. PROFILES.IS_WOMAN — profesoras etiquetadas por el equipo ───────────
-- Alimenta la sección del Home "Clases con profesoras" y el filtro
-- /clases?profesoras=1 (clases cuya profesora es mujer).
--
-- Decisión de producto: el dato NO lo declara el usuario ni se infiere del
-- nombre. Lo etiqueta un admin de Kynea desde /dashboard/admin/profesoras.
--   NULL / false = sin etiquetar (no entra en la sección). true = profesora.
-- Solo aplica a role = 'profesor'; las academias no tienen género.
--
-- La columna es legible para anon igual que el resto de profiles (la policy de
-- SELECT es por fila, no por columna). Por eso es solo un booleano de curaduría
-- editorial, no un dato sensible declarado por el usuario.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_woman boolean;

COMMENT ON COLUMN public.profiles.is_woman IS
  'true = profesora etiquetada por un admin de Kynea (sección "Clases con profesoras"). NULL/false = sin etiquetar. Solo role=profesor.';

-- Mismo patrón que protect_profile_role (29), is_admin (31) y academia_approved_at (43):
-- profiles_update es USING (auth.uid() = id) sin WITH CHECK, así que sin este trigger
-- cualquier profesor podría hacer supabase.from('profiles').update({ is_woman: true })
-- desde el cliente. Solo se permite el cambio dentro de admin_set_profile_woman()
-- (SECURITY DEFINER, dueño postgres → current_user = 'postgres').
CREATE OR REPLACE FUNCTION public.protect_profile_is_woman()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_woman IS DISTINCT FROM OLD.is_woman THEN
    IF current_user <> 'postgres' THEN
      RAISE EXCEPTION 'is_woman solo puede cambiar vía admin_set_profile_woman().';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_is_woman_on_update
  BEFORE UPDATE OF is_woman ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_is_woman();

-- ADVERTENCIA: SECURITY DEFINER se salta RLS. La ÚNICA barrera es el chequeo
-- public.is_admin() de la primera línea (ver migración 33). No moverlo ni debilitarlo.
CREATE OR REPLACE FUNCTION public.admin_set_profile_woman(
  p_profile_id uuid,
  p_is_woman   boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'No autorizado'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.profiles
  SET is_woman = p_is_woman
  WHERE id = p_profile_id
    AND role = 'profesor';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profesor no encontrado'
      USING ERRCODE = 'no_data_found';
  END IF;
END;
$$;

-- Postgres otorga EXECUTE a PUBLIC por defecto: se revoca y se concede solo a usuarios autenticados
-- (el chequeo is_admin() es la barrera real; esto evita exponerla a anon).
REVOKE ALL ON FUNCTION public.admin_set_profile_woman(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_profile_woman(uuid, boolean) TO authenticated;

-- Índice parcial pequeño: el filtro del Home/Clases solo busca las etiquetadas.
CREATE INDEX IF NOT EXISTS profiles_is_woman_idx ON public.profiles (id) WHERE is_woman = true;
