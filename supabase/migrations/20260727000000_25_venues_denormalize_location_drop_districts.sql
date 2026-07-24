-- 25. VENUES/PROFILES — denormalize location, drop districts
--
-- Crear Clase now collects address exclusively through Google Places
-- autocomplete: city/district are extracted straight from the place's
-- addressComponents and stored as plain text on `venues`, instead of being
-- resolved against a curated `districts` catalog. This scales with Peru's
-- real UBIGEO complexity (see migration 23, 1833 districts across 194
-- provinces) without the app needing to keep that catalog in sync or force
-- teachers through a 194-option <select>.
--
-- Perfil's own Ciudad/Distrito fields are removed outright (never displayed
-- anywhere outside the edit form itself — verified by grep before deciding
-- this), so `profiles.district_id` has no replacement column; it's just
-- dropped.
--
-- Order matters: back-fill `venues.city`/`district` from the still-live
-- `districts` join BEFORE dropping `district_id`, so existing classes don't
-- lose their location. Whether this runs before or after migration 23 seeds
-- districts nationally doesn't matter — the FK'd rows (Lima/Arequipa/Cusco/
-- Trujillo/Piura/Chiclayo, seeded in migration 11) are already present
-- either way.

ALTER TABLE public.venues ADD COLUMN city text, ADD COLUMN district text;

UPDATE public.venues v
  SET city = d.city, district = d.name
  FROM public.districts d
  WHERE v.district_id = d.id;

ALTER TABLE public.venues DROP COLUMN district_id;

ALTER TABLE public.profiles DROP COLUMN district_id;

DROP TABLE public.districts CASCADE;
