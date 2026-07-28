-- 31. PROFILES — columna is_admin + trigger de protección + helper de RLS.
--
-- Defiende contra que un cliente autenticado se auto-otorgue privilegios de
-- administrador. `profiles_update` (10_rls_policies.sql) es
-- `USING (auth.uid() = id)` sin WITH CHECK, y `profiles_insert` es
-- `WITH CHECK (auth.uid() = id)` — ninguna de las dos impide que el propio
-- usuario escriba `is_admin = true` en su fila vía UPDATE o vía
-- upsert/INSERT. Este trigger corre a nivel de Postgres, no de RLS, así que
-- cierra el hueco sin importar qué cliente o rol de base de datos ejecute
-- la escritura.
--
-- El predicado usa `current_user`, NO `auth.role()` ni `session_user`:
-- - PostgREST conecta como el rol de login `authenticator` y luego hace
--   `SET ROLE` al rol real nombrado por el claim `role` del JWT (`anon`,
--   `authenticated`, `service_role`). Por eso `current_user` es exactamente
--   `authenticated` para un cliente normal y exactamente `service_role`
--   para una llamada con la service key — es el discriminador correcto.
-- - `session_user` es SIEMPRE `authenticator` en cada request de PostgREST,
--   incluidas las de service_role (SET ROLE no cambia session_user):
--   no distingue nada.
-- - `auth.role()` devuelve NULL en una conexión directa por psql/CLI/SQL
--   Editor (no hay GUC de request), lo que bloquearía el único camino
--   legítimo de otorgar admin manualmente.
--
-- ADVERTENCIA CRÍTICA: la función del trigger DEBE ser SECURITY INVOKER
-- (el default de Postgres — NO agregar SECURITY DEFINER). Si fuera
-- SECURITY DEFINER y el dueño de la función es `postgres`, `current_user`
-- dentro del cuerpo evaluaría siempre a `postgres` y el guard pasaría
-- incondicionalmente para cualquier caller, dejando la protección
-- silenciosamente inutilizada. Nunca introducir una función SECURITY
-- DEFINER que escriba `profiles.is_admin` a partir de input de cliente —
-- heredaría este mismo bypass.
ALTER TABLE public.profiles ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

CREATE INDEX profiles_is_admin_idx ON public.profiles (id) WHERE is_admin = true;

CREATE OR REPLACE FUNCTION public.protect_profile_is_admin()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN NEW;                       -- operador humano / camino de backend
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.is_admin THEN
      RAISE EXCEPTION 'No se puede asignar privilegios de administrador.';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'No se puede modificar privilegios de administrador.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_is_admin_on_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_is_admin();

CREATE TRIGGER protect_profile_is_admin_on_update
  BEFORE UPDATE OF is_admin ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_is_admin();

-- Helper SECURITY DEFINER para uso futuro en políticas RLS. SECURITY
-- DEFINER es necesario (no estilístico): permite leer `profiles` sin
-- reentrar las propias políticas RLS de `profiles`, evitando recursión
-- infinita si en el futuro se llama desde una policy sobre esa misma
-- tabla. No se aplica a ninguna policy existente en esta migración.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE((SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()), false);
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
