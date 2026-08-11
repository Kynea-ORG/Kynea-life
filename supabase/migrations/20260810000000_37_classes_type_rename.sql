-- 37. CLASS TYPE RENAME — 'clase' → 'taller', 'curso' → 'programa', add 'workshop'
-- Backfills existing rows before tightening the CHECK constraint, so no class
-- already published in production is left with a value the app no longer
-- recognizes. 'clase-suelta', 'masterclass' and 'evento' are untouched.

UPDATE public.classes SET type = 'taller'   WHERE type = 'clase';
UPDATE public.classes SET type = 'programa' WHERE type = 'curso';

ALTER TABLE public.classes
  DROP CONSTRAINT IF EXISTS classes_type_check;

ALTER TABLE public.classes
  ADD CONSTRAINT classes_type_check
  CHECK (type IN ('taller', 'clase-suelta', 'programa', 'masterclass', 'evento', 'workshop'));
