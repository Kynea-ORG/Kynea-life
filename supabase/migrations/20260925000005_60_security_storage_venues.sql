-- 59. HARDENING DE STORAGE Y VENUES
-- Restringe la creación de locales y la subida de imágenes a los roles adecuados.

-- ── 1. BLINDAJE DE VENUES ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "venues_insert" ON public.venues;
DROP POLICY IF EXISTS "venues_update" ON public.venues;
DROP POLICY IF EXISTS "venues_delete" ON public.venues;

-- Solo usuarios con rol 'profesor' o 'academia' pueden crear, modificar o eliminar sedes
CREATE POLICY "venues_insert" ON public.venues
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('profesor', 'academia')
    )
  );

CREATE POLICY "venues_update" ON public.venues
  FOR UPDATE USING (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('profesor', 'academia')
    )
  );

CREATE POLICY "venues_delete" ON public.venues
  FOR DELETE USING (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('profesor', 'academia')
    )
  );

-- ── 2. BLINDAJE DE STORAGE: CLASS-IMAGES ─────────────────────────────────────
-- Impide que alumnos o cuentas sin privilegios suban imágenes a class-images

DROP POLICY IF EXISTS "class_images_upload" ON storage.objects;
DROP POLICY IF EXISTS "class_images_delete" ON storage.objects;

CREATE POLICY "class_images_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'class-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('profesor', 'academia')
    )
  );

CREATE POLICY "class_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'class-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('profesor', 'academia')
    )
  );

-- ── 3. BLINDAJE DE STORAGE: BLOG-IMAGES ──────────────────────────────────────
-- Asegura que solo los administradores puedan subir o borrar fotos del blog

DROP POLICY IF EXISTS "blog_images_upload" ON storage.objects;
DROP POLICY IF EXISTS "blog_images_delete" ON storage.objects;

CREATE POLICY "blog_images_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'blog-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_admin()
  );

CREATE POLICY "blog_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'blog-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_admin()
  );
