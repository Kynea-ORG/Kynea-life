-- 65. DANCE_STYLES — Agregar "Danza Aérea" y "Danzas Afroperuanas", corregir
-- "Danzas folclóricas" a "Danzas Folclóricas", y consolidar/eliminar "Folklore"
-- migrando de forma segura las referencias existentes en clases y perfiles hacia
-- "Danzas Folclóricas".

-- 1. Normalizar y corregir la ortografía de "Danzas Folclóricas"
UPDATE public.dance_styles
SET name = 'Danzas Folclóricas'
WHERE slug = 'danzas-folkloricas';

-- 2. Consolidar clases y perfiles que usaban "Folklore" hacia "Danzas Folclóricas"
DO $$
DECLARE
  v_folklore_id smallint;
  v_folkloricas_id smallint;
BEGIN
  SELECT id INTO v_folklore_id FROM public.dance_styles WHERE slug = 'folklore';
  SELECT id INTO v_folkloricas_id FROM public.dance_styles WHERE slug = 'danzas-folkloricas';

  IF v_folklore_id IS NOT NULL AND v_folkloricas_id IS NOT NULL THEN
    -- Migrar class_styles evitando duplicados en clave primaria (class_id, style_id)
    UPDATE public.class_styles
    SET style_id = v_folkloricas_id
    WHERE style_id = v_folklore_id
      AND class_id NOT IN (
        SELECT class_id FROM public.class_styles WHERE style_id = v_folkloricas_id
      );

    -- Eliminar las filas redundantes de class_styles que ya tenían v_folkloricas_id
    DELETE FROM public.class_styles WHERE style_id = v_folklore_id;

    -- Migrar profile_styles evitando duplicados en clave primaria (profile_id, style_id)
    UPDATE public.profile_styles
    SET style_id = v_folkloricas_id
    WHERE style_id = v_folklore_id
      AND profile_id NOT IN (
        SELECT profile_id FROM public.profile_styles WHERE style_id = v_folkloricas_id
      );

    -- Eliminar las filas redundantes de profile_styles que ya tenían v_folkloricas_id
    DELETE FROM public.profile_styles WHERE style_id = v_folklore_id;

    -- Finalmente eliminar el estilo 'folklore'
    DELETE FROM public.dance_styles WHERE id = v_folklore_id;
  END IF;
END $$;

-- 3. Insertar los nuevos estilos "Danza Aérea" y "Danzas Afroperuanas"
INSERT INTO public.dance_styles (name, slug, emoji, ord) VALUES
  ('Danza Aérea', 'danza-aerea', '🎪', 20),
  ('Danzas Afroperuanas', 'danzas-afroperuanas', '🥁', 21)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      emoji = EXCLUDED.emoji;

-- 4. Reordenar alfabéticamente todo el catálogo para mantener coherencia en listados
UPDATE public.dance_styles SET ord = 1  WHERE slug = 'acro-chair';
UPDATE public.dance_styles SET ord = 2  WHERE slug = 'acroverticales';
UPDATE public.dance_styles SET ord = 3  WHERE slug = 'afro';
UPDATE public.dance_styles SET ord = 4  WHERE slug = 'afrohouse';
UPDATE public.dance_styles SET ord = 5  WHERE slug = 'axe';
UPDATE public.dance_styles SET ord = 6  WHERE slug = 'bachata';
UPDATE public.dance_styles SET ord = 7  WHERE slug = 'ballet';
UPDATE public.dance_styles SET ord = 8  WHERE slug = 'bhangra';
UPDATE public.dance_styles SET ord = 9  WHERE slug = 'bollywood';
UPDATE public.dance_styles SET ord = 10 WHERE slug = 'breaking';
UPDATE public.dance_styles SET ord = 11 WHERE slug = 'burlesque';
UPDATE public.dance_styles SET ord = 12 WHERE slug = 'cabaret';
UPDATE public.dance_styles SET ord = 13 WHERE slug = 'caporales';
UPDATE public.dance_styles SET ord = 14 WHERE slug = 'cha-cha-cha';
UPDATE public.dance_styles SET ord = 15 WHERE slug = 'chair-dance';
UPDATE public.dance_styles SET ord = 16 WHERE slug = 'charleston';
UPDATE public.dance_styles SET ord = 17 WHERE slug = 'contemporaneo';
UPDATE public.dance_styles SET ord = 18 WHERE slug = 'country';
UPDATE public.dance_styles SET ord = 19 WHERE slug = 'cumbia';
UPDATE public.dance_styles SET ord = 20 WHERE slug = 'dancehall';
UPDATE public.dance_styles SET ord = 21 WHERE slug = 'danza-aerea';
UPDATE public.dance_styles SET ord = 22 WHERE slug = 'danzas-afroperuanas';
UPDATE public.dance_styles SET ord = 23 WHERE slug = 'danzas-arabes';
UPDATE public.dance_styles SET ord = 24 WHERE slug = 'danzas-folkloricas';
UPDATE public.dance_styles SET ord = 25 WHERE slug = 'experimental';
UPDATE public.dance_styles SET ord = 26 WHERE slug = 'flamenco';
UPDATE public.dance_styles SET ord = 27 WHERE slug = 'flexibilidad';
UPDATE public.dance_styles SET ord = 28 WHERE slug = 'heels';
UPDATE public.dance_styles SET ord = 29 WHERE slug = 'hip-hop';
UPDATE public.dance_styles SET ord = 30 WHERE slug = 'house';
UPDATE public.dance_styles SET ord = 31 WHERE slug = 'jazz';
UPDATE public.dance_styles SET ord = 32 WHERE slug = 'jazz-funk';
UPDATE public.dance_styles SET ord = 33 WHERE slug = 'jazz-lirico';
UPDATE public.dance_styles SET ord = 34 WHERE slug = 'k-pop';
UPDATE public.dance_styles SET ord = 35 WHERE slug = 'kizomba';
UPDATE public.dance_styles SET ord = 36 WHERE slug = 'krump';
UPDATE public.dance_styles SET ord = 37 WHERE slug = 'lambada';
UPDATE public.dance_styles SET ord = 38 WHERE slug = 'locking';
UPDATE public.dance_styles SET ord = 39 WHERE slug = 'mambo';
UPDATE public.dance_styles SET ord = 40 WHERE slug = 'marinera';
UPDATE public.dance_styles SET ord = 41 WHERE slug = 'merengue';
UPDATE public.dance_styles SET ord = 42 WHERE slug = 'morenada';
UPDATE public.dance_styles SET ord = 43 WHERE slug = 'pole-dance';
UPDATE public.dance_styles SET ord = 44 WHERE slug = 'popping';
UPDATE public.dance_styles SET ord = 45 WHERE slug = 'preparacion-fisica';
UPDATE public.dance_styles SET ord = 46 WHERE slug = 'reggaeton';
UPDATE public.dance_styles SET ord = 47 WHERE slug = 'reparto';
UPDATE public.dance_styles SET ord = 48 WHERE slug = 'rock-and-roll';
UPDATE public.dance_styles SET ord = 49 WHERE slug = 'salsa';
UPDATE public.dance_styles SET ord = 50 WHERE slug = 'sexy-dance';
UPDATE public.dance_styles SET ord = 51 WHERE slug = 'street-dance';
UPDATE public.dance_styles SET ord = 52 WHERE slug = 'street-jazz';
UPDATE public.dance_styles SET ord = 53 WHERE slug = 'swing';
UPDATE public.dance_styles SET ord = 54 WHERE slug = 'tango';
UPDATE public.dance_styles SET ord = 55 WHERE slug = 'tap';
UPDATE public.dance_styles SET ord = 56 WHERE slug = 'tondero';
UPDATE public.dance_styles SET ord = 57 WHERE slug = 'twerk';
UPDATE public.dance_styles SET ord = 58 WHERE slug = 'urbano';
UPDATE public.dance_styles SET ord = 59 WHERE slug = 'vals';
UPDATE public.dance_styles SET ord = 60 WHERE slug = 'waacking';
UPDATE public.dance_styles SET ord = 61 WHERE slug = 'zumba';
