-- ── 49. BLOG ────────────────────────────────────────────────────────────────
-- Blog editorial de Kynea (kynea.dance/blog) — contenido para SEO orgánico y
-- banners internos que empujan tráfico hacia el marketplace (clases/perfiles).
-- Solo los admins escriben posts (mismo public.is_admin() que ya gatea
-- app/dashboard/admin/) — no hay flujo de autoría para profesor/academia, así
-- que a diferencia de `classes` no hace falta una policy de "dueño edita lo
-- suyo": todo admin puede editar cualquier post.

CREATE TABLE public.blog_posts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  text UNIQUE,
  title                 text NOT NULL,
  excerpt               text,
  content               text NOT NULL DEFAULT '',
  cover_image           text,
  cover_image_position  text DEFAULT '50% 50%',
  category              text,
  status                text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author_id             uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at          timestamptz,
  meta_title            text,
  meta_description      text,
  cta_label             text,
  cta_href              text,
  cta_image             text,
  views_count           integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX blog_posts_status_published_at_idx ON public.blog_posts (status, published_at DESC);
CREATE INDEX blog_posts_category_idx ON public.blog_posts (category) WHERE category IS NOT NULL;

-- Slug: mismo patrón que generate_profile_slug()/set_profile_slug()
-- (20260730000000_28_profiles_slug_and_whatsapp_visibility.sql) — se
-- regenera si cambia el título, porque a diferencia del slug de una clase
-- (fijo desde el alta) el título de un post sí se edita después de creado.
CREATE OR REPLACE FUNCTION public.generate_blog_post_slug(p_title text, p_id uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  base      text    := NULLIF(public.slugify(COALESCE(p_title, '')), '');
  candidate text;
  counter   integer := 2;
BEGIN
  IF base IS NULL THEN
    RETURN NULL;
  END IF;
  candidate := base;
  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.blog_posts WHERE slug = candidate AND id != p_id
    );
    candidate := base || '-' || counter;
    counter   := counter + 1;
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_blog_post_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.slug := public.generate_blog_post_slug(NEW.title, NEW.id);
  ELSIF NEW.title IS DISTINCT FROM OLD.title THEN
    NEW.slug := public.generate_blog_post_slug(NEW.title, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER blog_post_slug_on_insert
  BEFORE INSERT ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_blog_post_slug();

CREATE TRIGGER blog_post_slug_on_title_update
  BEFORE UPDATE OF title ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_blog_post_slug();

-- public.set_updated_at() ya existe (20260705000060_06_triggers.sql), reusado
-- tal cual por profiles/classes/venues.
CREATE TRIGGER set_updated_at_blog_posts
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_posts_public_read" ON public.blog_posts
  FOR SELECT USING (status = 'published');

-- Un admin necesita ver también sus propios borradores en el panel — sin
-- esto, la policy pública de arriba se lo escondería a él también.
CREATE POLICY "blog_posts_admin_read" ON public.blog_posts
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "blog_posts_admin_write" ON public.blog_posts
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "blog_posts_admin_update" ON public.blog_posts
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "blog_posts_admin_delete" ON public.blog_posts
  FOR DELETE TO authenticated USING (public.is_admin());

-- ── Storage: banco de imágenes del blog (portadas + banners CTA) ────────────
-- Mismas 3 policies que class-images (20260705000120_12_storage.sql), con
-- bucket propio — el blog es contenido de admin, no de profesor/academia, así
-- que no debe compartir bucket con las fotos de clases.
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "blog_images_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'blog-images');

CREATE POLICY "blog_images_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'blog-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "blog_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'blog-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
