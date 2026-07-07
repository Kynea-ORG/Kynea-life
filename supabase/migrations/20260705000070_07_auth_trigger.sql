-- ── 7. TRIGGER: Nuevo usuario en Auth ───────────────────────────────────────
-- Crea el perfil automáticamente al registrarse. role puede ser NULL
-- (caso Google OAuth desde /login — se completa en /completar-registro).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name'
    ),
    new.raw_user_meta_data->>'role'
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
