-- 45. UPGRADE ALUMNO -> PROFESOR — autoservicio, sin aprobación de admin.
--
-- Ver el plan de esta feature (shimmering-stargazing-sun.md) para el
-- razonamiento completo. Resumen: a diferencia de profesor -> academia
-- (migración 39, requiere revisión manual porque "academia" es una
-- identidad institucional que Kynea verifica a mano), convertirse en
-- profesor individual no tiene ese mismo problema — hoy cualquiera puede
-- registrarse como profesor desde cero en /unete sin ninguna aprobación.
-- Por consistencia, un alumno que quiere pasar a profesor pasa por el
-- mismo mini-onboarding y el cambio de rol es inmediato, sin cola de
-- revisión ni tabla de solicitudes.

-- ── upgrade_alumno_to_profesor() ─────────────────────────────────────────
-- A diferencia de approve_academia_request() (admin-only, valida
-- is_admin() del caller), esta es autoservicio: el único chequeo de
-- seguridad es `WHERE id = auth.uid()`, así que cada quien solo puede
-- voltear su propia fila y solo si hoy es 'alumno'. No toca ningún otro
-- campo del perfil — eso lo guarda el updateProfile() normal que ya usa
-- el wizard de onboarding, sin duplicar esa lógica acá.
CREATE OR REPLACE FUNCTION public.upgrade_alumno_to_profesor()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public.profiles
  SET role = 'profesor'
  WHERE id = auth.uid() AND role = 'alumno';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solo un alumno puede convertirse en profesor.';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upgrade_alumno_to_profesor() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.upgrade_alumno_to_profesor() TO authenticated;

-- ── Segunda excepción angosta a la inmutabilidad de rol ─────────────────
-- Mismo patrón exacto que la excepción profesor -> academia de la
-- migración 39: dentro de upgrade_alumno_to_profesor() (SECURITY DEFINER,
-- dueño postgres) current_user es exactamente 'postgres', nunca
-- 'authenticated' ni 'service_role' — cualquier otro origen sigue
-- bloqueado exactamente como antes.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.role IS NOT NULL AND NEW.role IS DISTINCT FROM OLD.role THEN
    IF current_user = 'postgres' AND (
      (OLD.role = 'profesor' AND NEW.role = 'academia') OR
      (OLD.role = 'alumno'   AND NEW.role = 'profesor')
    ) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'No se puede cambiar el rol de una cuenta ya registrada.';
  END IF;
  RETURN NEW;
END;
$$;
