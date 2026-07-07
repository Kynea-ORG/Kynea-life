-- ── 1. FUNCIONES HELPER ─────────────────────────────────────────────────────

-- Convierte texto a slug URL-safe (elimina tildes, espacios → guiones)
CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(
        translate(
          trim(input),
          'áàäâéèëêíìïîóòöôúùüûñÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑ',
          'aaaaeeeeiiiioooouuuunAAAAEEEEIIIIOOOOUUUUN'
        ),
        '[^a-z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  );
$$;

-- Genera slug único para una clase (añade sufijo numérico en caso de colisión)
CREATE OR REPLACE FUNCTION public.generate_class_slug(p_title text, p_id uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  base      text    := public.slugify(p_title);
  candidate text    := base;
  counter   integer := 2;
BEGIN
  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.classes WHERE slug = candidate AND id != p_id
    );
    candidate := base || '-' || counter;
    counter   := counter + 1;
  END LOOP;
  RETURN candidate;
END;
$$;

-- Trigger function: asigna slug al insertar
CREATE OR REPLACE FUNCTION public.set_class_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.slug := public.generate_class_slug(NEW.title, NEW.id);
  RETURN NEW;
END;
$$;

-- Trigger function: actualiza updated_at automáticamente en cualquier UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
