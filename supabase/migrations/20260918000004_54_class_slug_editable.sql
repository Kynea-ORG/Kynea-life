-- ── 54. CLASS SLUG EDITABLE ──────────────────────────────────────────────
-- set_class_slug() solo corría en INSERT, así que el slug quedaba fijo para
-- siempre desde que se creaba la clase — sin forma de arreglarlo a mano.
-- Eso es un problema real con "Duplicar clase" (app/dashboard/mis-clases):
-- copia el título como "<título> (copia)" y ese texto, slugificado, es la
-- URL final ("bachata-basico-copia-2"), y no había ningún campo para
-- corregirla después. Mismo patrón que 52_blog_slug_editable.sql: el slug
-- es la fuente de verdad una vez asignado, un cambio de título por sí solo
-- ya no lo toca, y el profesor lo edita a mano desde el campo de URL del
-- formulario de clase (vacío = pedir que se regenere del título actual).
CREATE OR REPLACE FUNCTION public.set_class_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.slug := public.generate_class_slug(COALESCE(NULLIF(trim(NEW.slug), ''), NEW.title), NEW.id);
  ELSIF NEW.slug IS DISTINCT FROM OLD.slug THEN
    NEW.slug := public.generate_class_slug(COALESCE(NULLIF(trim(NEW.slug), ''), NEW.title), NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS class_slug_on_insert ON public.classes;

CREATE TRIGGER class_slug_on_insert_or_slug_update
  BEFORE INSERT OR UPDATE OF slug ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.set_class_slug();
