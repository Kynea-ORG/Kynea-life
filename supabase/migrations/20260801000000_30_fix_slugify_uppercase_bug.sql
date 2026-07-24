-- 30. Corrige slugify(): borraba la primera letra de cada palabra en mayúscula
--
-- slugify() aplicaba lower() como paso FINAL, pero el regexp_replace que
-- limpia caracteres inválidos corría ANTES, con el patrón `[^a-z0-9\s-]`
-- (solo minúsculas) — cualquier mayúscula del texto original (no solo las
-- vocales/ñ con tilde, cualquier letra) se trataba como carácter inválido y
-- se borraba. Ejemplo real: "José Armando Ñiquen Farroñay" ->
-- (translate) "Jose Armando Niquen Farronay" -> (regex borra J/A/N/F, todas
-- mayúsculas) "ose rmando iquen arronay" -> slug "ose-rmando-iquen-arronay".
--
-- Esto afectaba a CUALQUIER nombre/título con mayúsculas (prácticamente
-- todos), no solo a la ñ — y a generate_class_slug() además de
-- generate_profile_slug(), porque ambas llaman a slugify().
CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(
    regexp_replace(
      lower(
        translate(
          trim(input),
          'áàäâéèëêíìïîóòöôúùüûñÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑ',
          'aaaaeeeeiiiioooouuuunAAAAEEEEIIIIOOOOUUUUN'
        )
      ),
      '[^a-z0-9\s-]', '', 'g'
    ),
    '\s+', '-', 'g'
  );
$$;

-- Regenera todos los slugs ya asignados con la función corregida — fila por
-- fila, no en un UPDATE masivo, por la misma razón que el backfill original
-- (generate_*_slug necesita ver los slugs ya reescritos de filas previas del
-- mismo lote para detectar colisiones correctamente).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, name FROM public.profiles ORDER BY created_at LOOP
    UPDATE public.profiles SET slug = public.generate_profile_slug(r.name, r.id) WHERE id = r.id;
  END LOOP;
END $$;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, title FROM public.classes ORDER BY created_at LOOP
    UPDATE public.classes SET slug = public.generate_class_slug(r.title, r.id) WHERE id = r.id;
  END LOOP;
END $$;
