-- 17. Uniqueness constraints — prevent duplicate rows regardless of cause
--
-- class_schedules: no constraint existed to stop the same class from getting
-- two rows for the same day+time slot. A bug in updateClassFromForm (fixed
-- separately) leaked exactly this kind of duplicate on every edit; this
-- constraint makes it impossible to reintroduce, from any code path.
--
-- venues: findOrCreateVenue looks up an existing venue by (owner_id,
-- place_id) before inserting, but nothing at the DB level stopped two
-- concurrent requests from both missing the lookup and inserting twins for
-- the same Google Place. Promoting the existing lookup index to UNIQUE
-- closes that race. place_id stays nullable (Online classes / manual
-- addresses have none), so the constraint only applies where it is set.

ALTER TABLE public.class_schedules
  ADD CONSTRAINT class_schedules_class_day_time_key
  UNIQUE (class_id, day_of_week, start_time, end_time);

DROP INDEX IF EXISTS public.venues_owner_place_idx;
CREATE UNIQUE INDEX venues_owner_place_idx
  ON public.venues (owner_id, place_id)
  WHERE place_id IS NOT NULL;
