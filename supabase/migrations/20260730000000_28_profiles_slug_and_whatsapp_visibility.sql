-- 28. PROFILES — slug público (en vez de exponer el uuid en /profesores/[slug])
--     + preferencias de visibilidad: ocultar WhatsApp y/o cupos disponibles.

-- Genera slug único para un perfil (añade sufijo numérico en caso de colisión),
-- misma estrategia que generate_class_slug() en 01_helper_functions.sql.
CREATE OR REPLACE FUNCTION public.generate_profile_slug(p_name text, p_id uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  base      text    := NULLIF(public.slugify(COALESCE(p_name, '')), '');
  candidate text;
  counter   integer := 2;
BEGIN
  IF base IS NULL THEN
    RETURN NULL;
  END IF;
  candidate := base;
  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE slug = candidate AND id != p_id
    );
    candidate := base || '-' || counter;
    counter   := counter + 1;
  END LOOP;
  RETURN candidate;
END;
$$;

-- Trigger function: asigna slug al insertar, y lo regenera si cambia el nombre
-- (a diferencia de las clases, el nombre de un perfil sí se edita después de
-- creado, desde onboarding o Mi perfil).
CREATE OR REPLACE FUNCTION public.set_profile_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.slug := public.generate_profile_slug(NEW.name, NEW.id);
  ELSIF NEW.name IS DISTINCT FROM OLD.name THEN
    NEW.slug := public.generate_profile_slug(NEW.name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE public.profiles ADD COLUMN slug text;
ALTER TABLE public.profiles ADD COLUMN show_whatsapp boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN show_spots boolean NOT NULL DEFAULT true;

-- Backfill fila por fila (no en un solo UPDATE masivo): generate_profile_slug()
-- necesita ver los slugs ya asignados a las filas anteriores del mismo lote
-- para detectar colisiones de nombre, y un UPDATE de tabla completa las
-- resolvería todas contra el mismo snapshot (todas verían slug IS NULL).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, name FROM public.profiles WHERE slug IS NULL ORDER BY created_at LOOP
    UPDATE public.profiles SET slug = public.generate_profile_slug(r.name, r.id) WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_slug_unique UNIQUE (slug);

CREATE TRIGGER profile_slug_on_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_profile_slug();

CREATE TRIGGER profile_slug_on_name_update
  BEFORE UPDATE OF name ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_profile_slug();
