-- 26. DANCE_STYLES — nuevas categorías (Preparación física, Flexibilidad,
-- Jazz Lírico, Street Dance) + reordena TODO el catálogo alfabéticamente.
--
-- A diferencia del reordenamiento visual del home (puramente en código, ver
-- HOME_CATEGORY_SLUGS en app/HomeClient.tsx), esto SÍ cambia ord en la base de
-- datos: afecta el dropdown de Crear Clase, los filtros de /clases, etc. — el
-- usuario pidió explícitamente "ordenar todas las categorías" para la
-- creación de clases, no solo la vista del home.

INSERT INTO public.dance_styles (name, slug, emoji, ord) VALUES
  ('Preparación física', 'preparacion-fisica', '💪', 51),
  ('Flexibilidad',       'flexibilidad',       '🧘', 52),
  ('Jazz Lírico',        'jazz-lirico',        '🎻', 53),
  ('Street Dance',       'street-dance',       '🛹', 54)
ON CONFLICT (slug) DO NOTHING;

-- Alfabético (acentos ignorados para el orden, como en un diccionario español).
UPDATE public.dance_styles SET ord = 1  WHERE slug = 'acroverticales';
UPDATE public.dance_styles SET ord = 2  WHERE slug = 'afro';
UPDATE public.dance_styles SET ord = 3  WHERE slug = 'afrohouse';
UPDATE public.dance_styles SET ord = 4  WHERE slug = 'axe';
UPDATE public.dance_styles SET ord = 5  WHERE slug = 'bachata';
UPDATE public.dance_styles SET ord = 6  WHERE slug = 'ballet';
UPDATE public.dance_styles SET ord = 7  WHERE slug = 'bhangra';
UPDATE public.dance_styles SET ord = 8  WHERE slug = 'bollywood';
UPDATE public.dance_styles SET ord = 9  WHERE slug = 'breaking';
UPDATE public.dance_styles SET ord = 10 WHERE slug = 'caporales';
UPDATE public.dance_styles SET ord = 11 WHERE slug = 'cha-cha-cha';
UPDATE public.dance_styles SET ord = 12 WHERE slug = 'charleston';
UPDATE public.dance_styles SET ord = 13 WHERE slug = 'contemporaneo';
UPDATE public.dance_styles SET ord = 14 WHERE slug = 'country';
UPDATE public.dance_styles SET ord = 15 WHERE slug = 'cumbia';
UPDATE public.dance_styles SET ord = 16 WHERE slug = 'dancehall';
UPDATE public.dance_styles SET ord = 17 WHERE slug = 'danzas-arabes';
UPDATE public.dance_styles SET ord = 18 WHERE slug = 'danzas-folkloricas';
UPDATE public.dance_styles SET ord = 19 WHERE slug = 'experimental';
UPDATE public.dance_styles SET ord = 20 WHERE slug = 'flamenco';
UPDATE public.dance_styles SET ord = 21 WHERE slug = 'flexibilidad';
UPDATE public.dance_styles SET ord = 22 WHERE slug = 'folklore';
UPDATE public.dance_styles SET ord = 23 WHERE slug = 'heels';
UPDATE public.dance_styles SET ord = 24 WHERE slug = 'hip-hop';
UPDATE public.dance_styles SET ord = 25 WHERE slug = 'house';
UPDATE public.dance_styles SET ord = 26 WHERE slug = 'jazz';
UPDATE public.dance_styles SET ord = 27 WHERE slug = 'jazz-funk';
UPDATE public.dance_styles SET ord = 28 WHERE slug = 'jazz-lirico';
UPDATE public.dance_styles SET ord = 29 WHERE slug = 'k-pop';
UPDATE public.dance_styles SET ord = 30 WHERE slug = 'kizomba';
UPDATE public.dance_styles SET ord = 31 WHERE slug = 'krump';
UPDATE public.dance_styles SET ord = 32 WHERE slug = 'lambada';
UPDATE public.dance_styles SET ord = 33 WHERE slug = 'locking';
UPDATE public.dance_styles SET ord = 34 WHERE slug = 'mambo';
UPDATE public.dance_styles SET ord = 35 WHERE slug = 'marinera';
UPDATE public.dance_styles SET ord = 36 WHERE slug = 'merengue';
UPDATE public.dance_styles SET ord = 37 WHERE slug = 'morenada';
UPDATE public.dance_styles SET ord = 38 WHERE slug = 'pole-dance';
UPDATE public.dance_styles SET ord = 39 WHERE slug = 'popping';
UPDATE public.dance_styles SET ord = 40 WHERE slug = 'preparacion-fisica';
UPDATE public.dance_styles SET ord = 41 WHERE slug = 'reggaeton';
UPDATE public.dance_styles SET ord = 42 WHERE slug = 'rock-and-roll';
UPDATE public.dance_styles SET ord = 43 WHERE slug = 'salsa';
UPDATE public.dance_styles SET ord = 44 WHERE slug = 'sexy-dance';
UPDATE public.dance_styles SET ord = 45 WHERE slug = 'street-dance';
UPDATE public.dance_styles SET ord = 46 WHERE slug = 'street-jazz';
UPDATE public.dance_styles SET ord = 47 WHERE slug = 'swing';
UPDATE public.dance_styles SET ord = 48 WHERE slug = 'tango';
UPDATE public.dance_styles SET ord = 49 WHERE slug = 'tap';
UPDATE public.dance_styles SET ord = 50 WHERE slug = 'twerk';
UPDATE public.dance_styles SET ord = 51 WHERE slug = 'urbano';
UPDATE public.dance_styles SET ord = 52 WHERE slug = 'vals';
UPDATE public.dance_styles SET ord = 53 WHERE slug = 'waacking';
UPDATE public.dance_styles SET ord = 54 WHERE slug = 'zumba';
