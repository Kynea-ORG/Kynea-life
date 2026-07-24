-- 26. CLASSES — persist recurrence type instead of inferring it
-- "unica" (single date) vs "mensual" (weekly recurring) was previously
-- inferred from class_schedules row/day count, which is ambiguous: a
-- weekly-recurring class meeting on exactly one weekday produces the same
-- single class_schedules row as a one-off class, so it was misclassified as
-- "unica" on edit — resetting the wizard's schedule step to that tab and, if
-- the teacher corrected it back to "mensual", wiping the saved time.
-- 'personalizado' is included even though unreachable in the UI today (see
-- CrearClaseForm.tsx) so activating it later doesn't need another migration.

ALTER TABLE public.classes
  ADD COLUMN recurrence text NOT NULL DEFAULT 'mensual'
  CHECK (recurrence IN ('unica', 'mensual', 'personalizado'));

-- One-time best-effort backfill for existing rows using the same heuristic
-- the app used before this migration — it's the only signal available for
-- data written prior to this column existing. Every save going forward
-- persists the teacher's actual choice instead of re-deriving it.
UPDATE public.classes c
SET recurrence = CASE
  WHEN (SELECT COUNT(*) FROM public.class_schedules s WHERE s.class_id = c.id) > 1 THEN 'mensual'
  ELSE 'unica'
END;
