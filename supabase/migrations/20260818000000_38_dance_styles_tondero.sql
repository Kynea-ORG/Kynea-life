-- 38. DANCE_STYLES — agrega "Tondero" (danza folklórica peruana), insertado
-- en su posición alfabética correcta, renumerando el resto del catálogo para
-- mantener el orden alfabético establecido en la migración 27 (y ya
-- extendido en las migraciones 34 y 36).

INSERT INTO public.dance_styles (name, slug, emoji, ord) VALUES
  ('Tondero', 'tondero', '🇵🇪', 55)
ON CONFLICT (slug) DO NOTHING;

-- Alfabético (acentos ignorados para el orden, como en un diccionario español).
UPDATE public.dance_styles SET ord = 56 WHERE slug = 'twerk';
UPDATE public.dance_styles SET ord = 57 WHERE slug = 'urbano';
UPDATE public.dance_styles SET ord = 58 WHERE slug = 'vals';
UPDATE public.dance_styles SET ord = 59 WHERE slug = 'waacking';
UPDATE public.dance_styles SET ord = 60 WHERE slug = 'zumba';
