-- ── 10. RLS ─────────────────────────────────────────────────────────────────

-- Catálogos: lectura pública, sin escritura desde cliente
ALTER TABLE public.dance_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select" ON public.dance_styles FOR SELECT USING (true);
CREATE POLICY "select" ON public.class_levels FOR SELECT USING (true);
CREATE POLICY "select" ON public.districts    FOR SELECT USING (true);

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Profile styles
ALTER TABLE public.profile_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_styles_select" ON public.profile_styles
  FOR SELECT USING (true);
CREATE POLICY "profile_styles_insert" ON public.profile_styles
  FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "profile_styles_delete" ON public.profile_styles
  FOR DELETE USING (auth.uid() = profile_id);

-- Venues
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venues_select" ON public.venues
  FOR SELECT USING (true);
CREATE POLICY "venues_insert" ON public.venues
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "venues_update" ON public.venues
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "venues_delete" ON public.venues
  FOR DELETE USING (auth.uid() = owner_id);

-- Classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classes_select" ON public.classes
  FOR SELECT USING (status = 'published' OR teacher_id = auth.uid());
CREATE POLICY "classes_insert" ON public.classes
  FOR INSERT WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "classes_update" ON public.classes
  FOR UPDATE USING (teacher_id = auth.uid());
CREATE POLICY "classes_delete" ON public.classes
  FOR DELETE USING (teacher_id = auth.uid());

-- Class styles (lectura pública — los estilos de una clase no son datos sensibles)
ALTER TABLE public.class_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_styles_select" ON public.class_styles
  FOR SELECT USING (true);
CREATE POLICY "class_styles_insert" ON public.class_styles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid())
  );
CREATE POLICY "class_styles_delete" ON public.class_styles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid())
  );

-- Class schedules (lectura pública)
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_schedules_select" ON public.class_schedules
  FOR SELECT USING (true);
CREATE POLICY "class_schedules_insert" ON public.class_schedules
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid())
  );
CREATE POLICY "class_schedules_update" ON public.class_schedules
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid())
  );
CREATE POLICY "class_schedules_delete" ON public.class_schedules
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id = auth.uid())
  );

-- Saved classes
ALTER TABLE public.saved_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_classes_select" ON public.saved_classes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saved_classes_insert" ON public.saved_classes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_classes_delete" ON public.saved_classes
  FOR DELETE USING (auth.uid() = user_id);
