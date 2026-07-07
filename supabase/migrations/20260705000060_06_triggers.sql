-- ── 6. TRIGGERS ─────────────────────────────────────────────────────────────

CREATE TRIGGER class_slug_on_insert
  BEFORE INSERT ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.set_class_slug();

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_classes
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_venues
  BEFORE UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
