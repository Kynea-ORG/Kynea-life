-- 14. CONTACT MODE — replace 'web' with 'both'
-- Forward-only. prod + kynea-dev confirmed zero rows in 'web' state, so no
-- backfill is needed. Recreating the CHECK would fail loudly on any 'web' row.

ALTER TABLE public.classes
  DROP CONSTRAINT IF EXISTS classes_contact_mode_check;

ALTER TABLE public.classes
  ADD CONSTRAINT classes_contact_mode_check
  CHECK (contact_mode IN ('whatsapp', 'instagram', 'both'));
