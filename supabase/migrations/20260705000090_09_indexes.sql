-- ── 10. ÍNDICES ──────────────────────────────────────────────────────────────

CREATE INDEX classes_teacher_idx      ON public.classes        (teacher_id);
CREATE INDEX classes_status_idx       ON public.classes        (status);
CREATE INDEX classes_level_idx        ON public.classes        (level_id);
CREATE INDEX classes_venue_idx        ON public.classes        (venue_id);
-- Índice parcial: solo clases publicadas ordenadas por fecha de publicación
CREATE INDEX classes_published_idx    ON public.classes        (published_at DESC)
  WHERE status = 'published';

CREATE INDEX class_styles_style_idx   ON public.class_styles   (style_id);

CREATE INDEX schedules_class_idx      ON public.class_schedules (class_id);
CREATE INDEX schedules_day_idx        ON public.class_schedules (day_of_week);

CREATE INDEX profile_styles_style_idx ON public.profile_styles  (style_id);

CREATE INDEX venues_owner_idx         ON public.venues          (owner_id);
CREATE INDEX venues_district_idx      ON public.venues          (district_id);

CREATE INDEX profiles_role_idx        ON public.profiles        (role);
CREATE INDEX profiles_district_idx    ON public.profiles        (district_id);
