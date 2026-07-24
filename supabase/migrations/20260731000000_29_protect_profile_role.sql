-- 29. PROFILES — el rol es inmutable una vez asignado.
--
-- profiles_update (10_rls_policies.sql) es `USING (auth.uid() = id)` sin
-- WITH CHECK: cualquier usuario autenticado puede hacer
-- `supabase.from('profiles').update({ role: 'academia' })` directamente con
-- la anon key (pública en el bundle del cliente) y auto-asignarse cualquier
-- rol en cualquier momento, evadiendo por completo el flujo de registro/
-- onboarding (incluida la opción "academia" deshabilitada en la UI).
--
-- Este trigger corre a nivel de Postgres, no de RLS — se aplica sin importar
-- qué cliente o rol de base de datos ejecute el UPDATE, así que cierra el
-- hueco incluso si alguien lo intenta con una llamada directa a la API REST.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Primera asignación (registro por correo, Google OAuth, completar-registro)
  -- pasa de NULL a un rol — eso sigue permitido.
  IF OLD.role IS NOT NULL AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'No se puede cambiar el rol de una cuenta ya registrada.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_role_on_update
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();
