-- 46. CONTADORES DE VISTAS — clases y perfiles.
--
-- classes.views_count existía desde la migración 05 pero nunca se
-- incrementaba en ningún lado del código — el stat "Visualizaciones" del
-- dashboard siempre mostraba 0. Se agrega el RPC que faltaba, mismo patrón
-- exacto que increment_class_contacts (migración 08).
CREATE OR REPLACE FUNCTION public.increment_class_views(target_class_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.classes
  SET views_count = views_count + 1
  WHERE id = target_class_id AND status = 'published';
$$;

-- Vistas de perfil (profesor/academia) — profiles no tenía ninguna columna
-- de vistas. Nueva, junto con su propio RPC, mismo patrón que arriba. Solo
-- profesor/academia tienen perfil público visitable; un alumno no acumula
-- vistas de perfil (no tiene página pública que las genere).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_profile_views(target_profile_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.profiles
  SET views_count = views_count + 1
  WHERE id = target_profile_id AND role IN ('profesor', 'academia');
$$;
