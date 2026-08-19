-- 37. CLASS TYPE RENAME — 'clase' → 'taller', 'curso' → 'programa', add 'workshop'
-- Drops the old CHECK constraint before backfilling, since the new values
-- ('taller', 'programa') aren't in its allowed set yet — updating rows
-- while it's still active violates it. 'clase-suelta', 'masterclass' and
-- 'evento' are untouched.

ALTER TABLE public.classes
  DROP CONSTRAINT IF EXISTS classes_type_check;

UPDATE public.classes SET type = 'taller'   WHERE type = 'clase';
UPDATE public.classes SET type = 'programa' WHERE type = 'curso';

ALTER TABLE public.classes
  ADD CONSTRAINT classes_type_check
  CHECK (type IN ('taller', 'clase-suelta', 'programa', 'masterclass', 'evento', 'workshop'));
