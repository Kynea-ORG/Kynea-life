-- 18. CLASSES — cover image focal point + zoom
-- Stores the CSS object-position value ("X% Y%") and the zoom level chosen
-- by the teacher when uploading the cover photo, so object-cover crops
-- consistently everywhere the image is displayed. Forward-only, additive
-- with defaults so existing rows keep today's centered/unzoomed behavior.

ALTER TABLE public.classes ADD COLUMN cover_image_position text NOT NULL DEFAULT '50% 50%';
ALTER TABLE public.classes ADD COLUMN cover_image_zoom numeric NOT NULL DEFAULT 1;
