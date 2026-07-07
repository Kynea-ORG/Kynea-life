-- ── 12. STORAGE ─────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('class-images', 'class-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "class_images_read"   ON storage.objects;
DROP POLICY IF EXISTS "class_images_upload" ON storage.objects;
DROP POLICY IF EXISTS "class_images_delete" ON storage.objects;

-- Lectura pública (bucket público)
CREATE POLICY "class_images_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'class-images');

-- Subida: solo a la propia carpeta <user-id>/...
CREATE POLICY "class_images_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'class-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Borrado: solo el dueño de la carpeta
CREATE POLICY "class_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'class-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
