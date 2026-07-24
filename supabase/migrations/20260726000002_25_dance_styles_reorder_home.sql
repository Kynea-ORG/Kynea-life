-- 25. DANCE_STYLES — Heels pasa al 3er lugar en el Home, Jazz sale del top 9
-- La tira de categorías del Home muestra las primeras 9 por `ord`. Se saca
-- Jazz de ese grupo y se sube Heels a la 3ra posición; el resto conserva su
-- orden relativo.

UPDATE public.dance_styles SET ord = 3  WHERE slug = 'heels';
UPDATE public.dance_styles SET ord = 4  WHERE slug = 'reggaeton';
UPDATE public.dance_styles SET ord = 5  WHERE slug = 'hip-hop';
UPDATE public.dance_styles SET ord = 6  WHERE slug = 'urbano';
UPDATE public.dance_styles SET ord = 7  WHERE slug = 'contemporaneo';
UPDATE public.dance_styles SET ord = 8  WHERE slug = 'ballet';
UPDATE public.dance_styles SET ord = 9  WHERE slug = 'jazz-funk';
UPDATE public.dance_styles SET ord = 10 WHERE slug = 'jazz';
