-- 33. DANCE_STYLES — nuevo estilo "Reparto", insertado en su posición
-- alfabética correcta (entre Reggaetón y Rock and Roll), renumerando el
-- resto del catálogo para mantener el orden alfabético establecido en la
-- migración 27.

INSERT INTO public.dance_styles (name, slug, emoji, ord) VALUES
  ('Reparto', 'reparto', '🔥', 42)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.dance_styles SET ord = 43 WHERE slug = 'rock-and-roll';
UPDATE public.dance_styles SET ord = 44 WHERE slug = 'salsa';
UPDATE public.dance_styles SET ord = 45 WHERE slug = 'sexy-dance';
UPDATE public.dance_styles SET ord = 46 WHERE slug = 'street-dance';
UPDATE public.dance_styles SET ord = 47 WHERE slug = 'street-jazz';
UPDATE public.dance_styles SET ord = 48 WHERE slug = 'swing';
UPDATE public.dance_styles SET ord = 49 WHERE slug = 'tango';
UPDATE public.dance_styles SET ord = 50 WHERE slug = 'tap';
UPDATE public.dance_styles SET ord = 51 WHERE slug = 'twerk';
UPDATE public.dance_styles SET ord = 52 WHERE slug = 'urbano';
UPDATE public.dance_styles SET ord = 53 WHERE slug = 'vals';
UPDATE public.dance_styles SET ord = 54 WHERE slug = 'waacking';
UPDATE public.dance_styles SET ord = 55 WHERE slug = 'zumba';
