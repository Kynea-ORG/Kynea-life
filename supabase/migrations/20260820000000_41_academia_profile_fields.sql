-- 41. ACADEMIA — campos corporativos adicionales para el perfil de academia.
--
-- Ver docs/TASKS.md sección 8 (TODO "Campos exclusivos para academia en
-- onboarding") y la conversación de producto que lo destrabó: el onboarding
-- de academia debía sentirse más corporativo (equipo, sedes, portada) en vez
-- de reusar exactamente los mismos campos que un profesor independiente.
--
-- Todos son opcionales y no bloquean nada — mismo criterio que `ruc`
-- (migración 39): enriquecen el perfil público y la solicitud de revisión,
-- no son requisito para terminar el onboarding ni para publicar clases.
--
-- `cover_image_position`/`cover_image_zoom` siguen el mismo patrón ya usado
-- por `profiles.photo_position`/`photo_zoom` (migración 19) y por
-- `classes.cover_image_position`/`cover_image_zoom` (migración 18): texto
-- "x% y%" para el focal point vía CSS object-position, numeric para el zoom.
ALTER TABLE public.profiles
  ADD COLUMN team_size          text,
  ADD COLUMN branch_count       text,
  ADD COLUMN cover_image_url    text,
  ADD COLUMN cover_image_position text NOT NULL DEFAULT '50% 50%',
  ADD COLUMN cover_image_zoom     numeric NOT NULL DEFAULT 1;
