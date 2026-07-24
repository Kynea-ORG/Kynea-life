-- 19. PROFILES — profile photo focal point + zoom
-- Same rationale as migration 18, applied to the teacher/academia profile
-- photo instead of the class cover image.

ALTER TABLE public.profiles ADD COLUMN photo_position text NOT NULL DEFAULT '50% 50%';
ALTER TABLE public.profiles ADD COLUMN photo_zoom numeric NOT NULL DEFAULT 1;
