-- 17. CLASSES — cover image focal point
-- Stores the CSS object-position value ("X% Y%") chosen by the teacher when
-- uploading the cover photo, so object-cover crops consistently everywhere
-- the image is displayed. Forward-only, additive with a default so existing
-- rows keep today's centered-crop behavior unchanged.

ALTER TABLE public.classes ADD COLUMN cover_image_position text NOT NULL DEFAULT '50% 50%';
