-- ── 67. SUPERUSUARIO: CLASES ASIGNADAS Y ORGANIZADORES EXTERNOS ──────────────
-- Permite a los administradores operando en modo Superusuario:
-- 1) Crear y gestionar clases asignadas a profesores/academias registrados (teacher_id = <id>, created_by_superuser = true).
-- 2) Crear y gestionar clases informativas a nombre del Superusuario con un organizador externo
--    no registrado (teacher_id = NULL, external_organizer_name = '...', external_info_url = 'https://...').

-- ── 1. COLUMNAS Y CONSTRAINTS EN CLASSES Y VENUES ────────────────────────────

ALTER TABLE public.classes
  ALTER COLUMN teacher_id DROP NOT NULL;

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS created_by_superuser    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_organizer_name text,
  ADD COLUMN IF NOT EXISTS external_info_url       text,
  ADD COLUMN IF NOT EXISTS external_whatsapp       text,
  ADD COLUMN IF NOT EXISTS external_instagram      text;

COMMENT ON COLUMN public.classes.created_by_superuser IS
  'true cuando la clase fue creada desde la cuenta Superusuario (ya sea asignada a un profesor/academia registrado o a un organizador externo).';
COMMENT ON COLUMN public.classes.external_organizer_name IS
  'Nombre del organizador externo no registrado en la plataforma (ej. Ministerio de Cultura). Mutuamente excluyente con teacher_id.';
COMMENT ON COLUMN public.classes.external_info_url IS
  'Enlace oficial para obtener más información sobre la clase/evento de un organizador externo (web, post, convocatoria).';
COMMENT ON COLUMN public.classes.external_whatsapp IS
  'Número de WhatsApp opcional del organizador externo.';
COMMENT ON COLUMN public.classes.external_instagram IS
  'Usuario o enlace de Instagram opcional del organizador externo.';

ALTER TABLE public.classes
  DROP CONSTRAINT IF EXISTS classes_owner_or_external_check;

ALTER TABLE public.classes
  ADD CONSTRAINT classes_owner_or_external_check CHECK (
    (teacher_id IS NOT NULL AND external_organizer_name IS NULL)
    OR (teacher_id IS NULL AND external_organizer_name IS NOT NULL AND btrim(external_organizer_name) <> '')
  );

CREATE INDEX IF NOT EXISTS classes_superuser_idx
  ON public.classes (created_at DESC)
  WHERE created_by_superuser = true;

-- Locales de clases con organizador externo no tienen un perfil propietario individual
ALTER TABLE public.venues
  ALTER COLUMN owner_id DROP NOT NULL;

-- ── 2. POLÍTICAS RLS EN CLASSES, STYLES, SCHEDULES Y VENUES ──────────────────

DROP POLICY IF EXISTS "classes_select" ON public.classes;
DROP POLICY IF EXISTS "classes_insert" ON public.classes;
DROP POLICY IF EXISTS "classes_update" ON public.classes;
DROP POLICY IF EXISTS "classes_delete" ON public.classes;

CREATE POLICY "classes_select" ON public.classes
  FOR SELECT USING (
    status = 'published'
    OR teacher_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY "classes_insert" ON public.classes
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR (
      teacher_id = auth.uid()
      AND created_by_superuser = false
      AND external_organizer_name IS NULL
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('profesor', 'academia')
      )
    )
  );

CREATE POLICY "classes_update" ON public.classes
  FOR UPDATE USING (
    public.is_admin()
    OR (
      teacher_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('profesor', 'academia')
      )
    )
  );

CREATE POLICY "classes_delete" ON public.classes
  FOR DELETE USING (
    public.is_admin()
    OR (
      teacher_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('profesor', 'academia')
      )
    )
  );

-- Class styles
DROP POLICY IF EXISTS "class_styles_insert" ON public.class_styles;
DROP POLICY IF EXISTS "class_styles_update" ON public.class_styles;
DROP POLICY IF EXISTS "class_styles_delete" ON public.class_styles;

CREATE POLICY "class_styles_insert" ON public.class_styles
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid())
  );

CREATE POLICY "class_styles_update" ON public.class_styles
  FOR UPDATE USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid())
  );

CREATE POLICY "class_styles_delete" ON public.class_styles
  FOR DELETE USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid())
  );

-- Class schedules
DROP POLICY IF EXISTS "class_schedules_insert" ON public.class_schedules;
DROP POLICY IF EXISTS "class_schedules_update" ON public.class_schedules;
DROP POLICY IF EXISTS "class_schedules_delete" ON public.class_schedules;

CREATE POLICY "class_schedules_insert" ON public.class_schedules
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid())
  );

CREATE POLICY "class_schedules_update" ON public.class_schedules
  FOR UPDATE USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid())
  );

CREATE POLICY "class_schedules_delete" ON public.class_schedules
  FOR DELETE USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid())
  );

-- Venues
DROP POLICY IF EXISTS "venues_insert" ON public.venues;
DROP POLICY IF EXISTS "venues_update" ON public.venues;
DROP POLICY IF EXISTS "venues_delete" ON public.venues;

CREATE POLICY "venues_insert" ON public.venues
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR (
      owner_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('profesor', 'academia')
      )
    )
  );

CREATE POLICY "venues_update" ON public.venues
  FOR UPDATE USING (
    public.is_admin()
    OR (
      owner_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('profesor', 'academia')
      )
    )
  );

CREATE POLICY "venues_delete" ON public.venues
  FOR DELETE USING (
    public.is_admin()
    OR (
      owner_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('profesor', 'academia')
      )
    )
  );

-- Storage: permitir subida de portadas de clases a admins operando como Superusuario
DROP POLICY IF EXISTS "class_images_upload" ON storage.objects;
DROP POLICY IF EXISTS "class_images_delete" ON storage.objects;

CREATE POLICY "class_images_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'class-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('profesor', 'academia')
      )
    )
  );

CREATE POLICY "class_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'class-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('profesor', 'academia')
      )
    )
  );

-- ── 3. TRIGGER DE PUBLICACIÓN CON SOPORTE PARA ORGANIZADOR EXTERNO ───────────

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

  -- Caso 1: Clase informativa con organizador externo (creada por Superusuario)
  IF NEW.external_organizer_name IS NOT NULL THEN
    IF NEW.external_info_url IS NULL OR btrim(NEW.external_info_url) !~* '^https?://' THEN
      RAISE EXCEPTION 'Ingresa un enlace oficial válido (https://...) para poder publicar esta clase.';
    END IF;
    RETURN NEW;
  END IF;

  -- Caso 2: Clase asociada a un perfil registrado (profesor o academia)
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
