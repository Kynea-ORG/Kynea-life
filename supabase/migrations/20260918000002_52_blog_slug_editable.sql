-- ── 52. BLOG SLUG EDITABLE ────────────────────────────────────────────────
-- Antes set_blog_post_slug() regeneraba el slug CADA VEZ que cambiaba el
-- título — sin ninguna forma de fijarlo a mano, y rompiendo en silencio
-- cualquier link ya compartido de un post publicado apenas alguien
-- retocaba el título. Ahora: el slug es la fuente de verdad una vez
-- asignado. Un cambio de título por sí solo ya NO toca el slug; el admin
-- lo cambia explícitamente desde el campo de slug del editor (vacío = pedir
-- que se regenere del título actual). generate_blog_post_slug() ya
-- slugifica y garantiza unicidad sobre cualquier texto que reciba, así que
-- sirve igual para un slug tipeado a mano que para uno derivado del título.
CREATE OR REPLACE FUNCTION public.set_blog_post_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.slug := public.generate_blog_post_slug(COALESCE(NULLIF(NEW.slug, ''), NEW.title), NEW.id);
  ELSIF NEW.slug IS DISTINCT FROM OLD.slug THEN
    -- El admin tocó el campo de slug a mano (o lo vació a propósito para
    -- pedir que se regenere del título actual).
    NEW.slug := public.generate_blog_post_slug(COALESCE(NULLIF(NEW.slug, ''), NEW.title), NEW.id);
  END IF;
  -- Si NEW.title cambió pero NEW.slug no, no se toca nada: el slug ya
  -- asignado sigue siendo la URL pública, a propósito.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS blog_post_slug_on_title_update ON public.blog_posts;

CREATE TRIGGER blog_post_slug_on_slug_or_title_update
  BEFORE UPDATE OF title, slug ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_blog_post_slug();
