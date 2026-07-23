-- 18. PROFILES — profile photo focal point
-- Same rationale as migration 17, applied to the teacher/academia profile
-- photo instead of the class cover image.

ALTER TABLE public.profiles ADD COLUMN photo_position text NOT NULL DEFAULT '50% 50%';
