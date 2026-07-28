-- ── 35. EMAIL ASSETS STORAGE ─────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('email-assets', 'email-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "email_assets_read" ON storage.objects;

-- Lectura pública (bucket público, usado para embeber imágenes en emails).
-- Sin políticas de INSERT/DELETE: la carga de assets la hace un admin
-- vía Dashboard/CLI con el service role, que bypassea RLS.
CREATE POLICY "email_assets_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'email-assets');
