-- 58. HARDENING DE SEGURIDAD: Blindaje de RLS en profiles y classes
-- Cierra la exposición pública de perfiles privados (alumnos/admins)
-- e impide la creación, modificación y publicación de clases por alumnos vía PostgREST.

-- ── 1. BLINDAJE DE PROFILES ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

-- Perfiles públicos: solo profesores y academias son visibles para cualquier visitante.
-- Perfiles privados: alumnos solo pueden ser leídos por ellos mismos o por un admin.
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    role IN ('profesor', 'academia')
    OR auth.uid() = id
    OR public.is_admin()
  );

-- ── 2. BLINDAJE DE CLASSES ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "classes_insert" ON public.classes;
DROP POLICY IF EXISTS "classes_update" ON public.classes;
DROP POLICY IF EXISTS "classes_delete" ON public.classes;

-- Solo usuarios con rol 'profesor' o 'academia' pueden crear, modificar o eliminar clases
CREATE POLICY "classes_insert" ON public.classes
  FOR INSERT WITH CHECK (
    teacher_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('profesor', 'academia')
    )
  );

CREATE POLICY "classes_update" ON public.classes
  FOR UPDATE USING (
    teacher_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('profesor', 'academia')
    )
  );

CREATE POLICY "classes_delete" ON public.classes
  FOR DELETE USING (
    teacher_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('profesor', 'academia')
    )
  );

-- ── 3. BLINDAJE DEL TRIGGER DE PUBLICACIÓN ──────────────────────────────────
-- Evita que un alumno que intente mutar status = 'published' directamente pueda publicar.
CREATE OR REPLACE FUNCTION public.protect_class_publish()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_whatsapp  text;
  v_instagram text;
  v_role      text;
  v_approved  timestamptz;
BEGIN
  IF NEW.status IS DISTINCT FROM 'published' THEN
    RETURN NEW;
  END IF;

  SELECT whatsapp, instagram, role, academia_approved_at
  INTO v_whatsapp, v_instagram, v_role, v_approved
  FROM public.profiles WHERE id = NEW.teacher_id;

  -- Alumnos nunca pueden publicar clases
  IF v_role = 'alumno' THEN
    RAISE EXCEPTION 'Los alumnos no tienen permisos para publicar clases.';
  END IF;

  -- Reglas de contacto
  IF NEW.contact_mode IN ('whatsapp', 'both') AND (v_whatsapp IS NULL OR btrim(v_whatsapp) = '') THEN
    RAISE EXCEPTION 'Agrega tu WhatsApp en tu perfil para poder publicar esta clase.';
  END IF;
  IF NEW.contact_mode IN ('instagram', 'both') AND (v_instagram IS NULL OR btrim(v_instagram) = '') THEN
    RAISE EXCEPTION 'Agrega tu Instagram en tu perfil para poder publicar esta clase.';
  END IF;

  -- Aprobación de academia
  IF v_role = 'academia' AND v_approved IS NULL THEN
    RAISE EXCEPTION 'Tu academia todavía está en revisión — puedes guardar como borrador mientras tanto.';
  END IF;

  RETURN NEW;
END;
$$;
