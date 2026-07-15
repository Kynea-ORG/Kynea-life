-- 15. VENUES — add Google Places identity
-- Forward-only, additive-nullable. No backfill: existing venue rows keep
-- place_id/lat/lng null until re-edited through the new Places-aware form.
-- Rollback = revert branch; the column can stay unused, no data loss.

ALTER TABLE public.venues ADD COLUMN place_id text;

CREATE INDEX venues_owner_place_idx
  ON public.venues (owner_id, place_id)
  WHERE place_id IS NOT NULL;
