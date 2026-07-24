-- 20. CLASS_STYLES — missing UPDATE policy
-- class_styles had SELECT/INSERT/DELETE policies but no UPDATE policy
-- (unlike its sibling class_schedules, which has all four). insertClassStyles
-- upserts on (class_id, style_id), so re-saving a class without changing its
-- dance style hits the ON CONFLICT DO UPDATE path — which RLS silently
-- denied with no UPDATE policy present, breaking every edit-and-republish
-- that kept the same style.

CREATE POLICY "class_styles_update" ON public.class_styles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid())
  );
