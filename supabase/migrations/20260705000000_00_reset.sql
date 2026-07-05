-- ── 0. LIMPIEZA ─────────────────────────────────────────────────────────────
-- DROP TABLE CASCADE elimina automáticamente triggers y FK dependientes.
-- Los DROP TRIGGER separados no son necesarios y fallan si la tabla no existe.

DROP TABLE IF EXISTS
  public.saved_classes,
  public.class_schedules,
  public.class_styles,
  public.classes,
  public.venues,
  public.profile_styles,
  public.profiles,
  public.districts,
  public.class_levels,
  public.dance_styles
CASCADE;

-- El trigger on auth.users debe removerse por separado (no es una tabla pública)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.handle_new_user()               CASCADE;
DROP FUNCTION IF EXISTS public.set_class_slug()                CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at()                CASCADE;
DROP FUNCTION IF EXISTS public.slugify(text)                   CASCADE;
DROP FUNCTION IF EXISTS public.generate_class_slug(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.increment_class_contacts(uuid)  CASCADE;
DROP FUNCTION IF EXISTS public.email_signup_provider(text)     CASCADE;
