-- 43. Protege profiles.academia_approved_at contra auto-aprobación.
--
-- La migración 39 agregó esta columna como gate de publicación para
-- academias, pero nunca le puso un trigger propio — a diferencia de `role`
-- (protect_profile_role, migración 29) e `is_admin` (protect_profile_is_admin,
-- migración 31). profiles_update (10_rls_policies.sql) es
-- `USING (auth.uid() = id)` sin WITH CHECK, así que cualquier cuenta
-- academia podía hacer
--   supabase.from('profiles').update({ academia_approved_at: new Date() })
-- desde el cliente y aprobarse a sí misma, saltando por completo
-- approve_academia_request() y la cola de revisión admin.
--
-- Mismo patrón que protect_profile_role(): solo se permite el cambio
-- cuando current_user = 'postgres', es decir, dentro de
-- approve_academia_request() (SECURITY DEFINER, dueño postgres). Cualquier
-- otro origen —incluida una cuenta admin logueada normalmente, que conecta
-- como 'authenticated'— queda bloqueado.

CREATE OR REPLACE FUNCTION public.protect_profile_academia_approved_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.academia_approved_at IS DISTINCT FROM OLD.academia_approved_at THEN
    IF current_user <> 'postgres' THEN
      RAISE EXCEPTION 'academia_approved_at solo puede cambiar vía approve_academia_request().';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_academia_approved_at_on_update
  BEFORE UPDATE OF academia_approved_at ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_academia_approved_at();
