-- 33. RPC: listado paginado de cuentas creadas desde /dashboard/admin.
--
-- ADVERTENCIA DE SEGURIDAD: SECURITY DEFINER se salta RLS por completo y
-- expone auth.users.email, que NO es accesible al rol `authenticated` vía
-- PostgREST. El GRANT no protege nada (Postgres otorga EXECUTE a PUBLIC por
-- defecto en toda función nueva; por eso el REVOKE de abajo). La ÚNICA
-- barrera real es el chequeo `public.is_admin()` de la primera línea del
-- cuerpo. Moverlo, debilitarlo o cortocircuitarlo = fuga de correos de
-- todas las cuentas creadas por admin. No tocar sin entender esto.
--
-- Reutiliza public.is_admin() (migración 31) en vez de re-implementar el
-- predicado: una sola fuente de verdad para "quién es admin".

CREATE OR REPLACE FUNCTION public.admin_list_created_users(
  p_page      integer DEFAULT 1,
  p_page_size integer DEFAULT 20
)
RETURNS TABLE (
  id           uuid,
  name         text,
  email        text,
  role         text,
  created_at   timestamptz,
  created_by   uuid,
  creator_name text,
  total_count  bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_page      integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 20), 1), 100);
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'No autorizado'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    u.email::text,
    p.role,
    p.created_at,
    p.created_by,
    admin_p.name AS creator_name,
    count(*) OVER () AS total_count
  FROM public.profiles p
  JOIN auth.users u          ON u.id = p.id
  LEFT JOIN public.profiles admin_p ON admin_p.id = p.created_by
  WHERE p.created_by IS NOT NULL
  ORDER BY p.created_at DESC, p.id DESC
  LIMIT v_page_size
  OFFSET (v_page - 1) * v_page_size;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_created_users(integer, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_list_created_users(integer, integer) TO authenticated;
