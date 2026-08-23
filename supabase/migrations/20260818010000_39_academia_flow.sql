-- 39. FLUJO DE ACADEMIAS — modelo de datos para registro directo, conversión
-- de profesor, y aprobación manual antes de poder publicar.
--
-- Ver docs/TASKS.md sección 8 para el diseño completo acordado. Resumen:
--
-- - `profiles.academia_approved_at`: gate de publicación (NULL = pendiente).
--   Solo relevante cuando role = 'academia'. No bloquea nada más de la
--   cuenta — onboarding, editar perfil, guardar borradores funcionan sin
--   restricción desde el día uno; el check vive en el guard de publicación
--   del lado de la app (lib/classes/publishGuard.ts), no aquí.
-- - `profiles.ruc`: campo propio de academia, opcional, editable como
--   cualquier otro campo de perfil vía updateProfile (no requiere revisión
--   por sí solo — es solo dato de contacto/legitimidad).
-- - `venues.is_primary`: marca la sede principal de un perfil para mostrar
--   en su página pública. Reusa `venues` en vez de duplicar dirección en
--   `profiles`, que la migración 25 eliminó a propósito porque no se
--   mostraba en ningún lado.
-- - `academia_requests`: solicitudes de alta (kind='signup', se crea al
--   terminar el onboarding de una academia nueva) o de conversión
--   (kind='conversion', un profesor pide pasar a academia). Un profesor
--   con una conversión pendiente sigue siendo profesor sin ninguna
--   restricción hasta que se apruebe o rechace — el rol no cambia hasta
--   ese momento.
-- - `approve_academia_request()`: única vía permitida para aprobar/
--   rechazar. SECURITY DEFINER (corre como su dueño, `postgres`) y valida
--   `public.is_admin()` del caller real (auth.uid()) antes de escribir
--   nada — mismo patrón que `public.is_admin()` de la migración 31. Al
--   aprobar una conversión, es también la única vía permitida para
--   cambiar `profiles.role` después del registro: ver la actualización de
--   `protect_profile_role()` al final de este archivo.

ALTER TABLE public.profiles
  ADD COLUMN ruc text,
  ADD COLUMN academia_approved_at timestamptz;

ALTER TABLE public.venues
  ADD COLUMN is_primary boolean NOT NULL DEFAULT false;

-- Una sola sede principal por dueño.
CREATE UNIQUE INDEX venues_one_primary_per_owner
  ON public.venues (owner_id) WHERE is_primary;

CREATE TABLE public.academia_requests (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind         text        NOT NULL CHECK (kind IN ('signup', 'conversion')),
  status       text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ruc          text,
  reviewed_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at  timestamptz,
  created_at   timestamptz DEFAULT now()
);

-- Como máximo una solicitud pendiente por perfil a la vez — evita
-- duplicados si el usuario reenvía el formulario. Tras un rechazo puede
-- volver a intentarlo: el índice solo mira las pendientes.
CREATE UNIQUE INDEX academia_requests_one_pending_per_profile
  ON public.academia_requests (profile_id) WHERE status = 'pending';

ALTER TABLE public.academia_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "academia_requests_select" ON public.academia_requests
  FOR SELECT USING (auth.uid() = profile_id OR public.is_admin());
CREATE POLICY "academia_requests_insert" ON public.academia_requests
  FOR INSERT WITH CHECK (auth.uid() = profile_id);
-- Sin policy de UPDATE/DELETE para clientes a propósito: aprobar/rechazar
-- solo ocurre vía approve_academia_request() de abajo (SECURITY DEFINER),
-- que hace su propio chequeo de is_admin() y bypassea RLS al ejecutar
-- como su dueño — ni siquiera un admin logueado normalmente puede hacer
-- `supabase.from('academia_requests').update(...)` directo.

-- ── Aprobación / rechazo ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.approve_academia_request(request_id uuid, approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_profile_id uuid;
  v_status     text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede aprobar o rechazar solicitudes.';
  END IF;

  SELECT profile_id, status INTO v_profile_id, v_status
  FROM public.academia_requests WHERE id = request_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada.';
  END IF;
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'Esta solicitud ya fue revisada.';
  END IF;

  UPDATE public.academia_requests
  SET status = CASE WHEN approve THEN 'approved' ELSE 'rejected' END,
      reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = request_id;

  -- Rechazar no toca el perfil en absoluto — si es una conversión, el
  -- profesor sigue siendo profesor tal cual, sin restricción alguna, como
  -- si nunca hubiera pedido el cambio.
  IF approve THEN
    UPDATE public.profiles
    SET role = 'academia', academia_approved_at = now()
    WHERE id = v_profile_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_academia_request(uuid, boolean) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.approve_academia_request(uuid, boolean) TO authenticated;

-- ── Excepción angosta a la inmutabilidad de rol (migración 29) ──────────
-- La única transición de rol permitida después del registro es
-- profesor -> academia, y solo cuando la ejecuta approve_academia_request()
-- de arriba: dentro de esa función `current_user` es exactamente `postgres`
-- (su dueño, por SECURITY DEFINER), nunca 'authenticated'. El chequeo NO
-- incluye 'service_role' ni 'supabase_admin' a propósito: cualquier código
-- de servidor que use la service key (p.ej. createAdminClient(), ya usado
-- por createUserAsAdmin) conecta como 'service_role', y si esa rama
-- estuviera permitida un update directo `profiles.role = 'academia'` desde
-- ese cliente evadiría por completo el chequeo de is_admin() y el registro
-- en academia_requests de approve_academia_request(). Solo el dueño de la
-- función (postgres) puede tomar este camino. Cualquier otro cambio de rol
-- sigue bloqueado exactamente como antes.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.role IS NOT NULL AND NEW.role IS DISTINCT FROM OLD.role THEN
    IF current_user = 'postgres'
       AND OLD.role = 'profesor' AND NEW.role = 'academia' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'No se puede cambiar el rol de una cuenta ya registrada.';
  END IF;
  RETURN NEW;
END;
$$;
