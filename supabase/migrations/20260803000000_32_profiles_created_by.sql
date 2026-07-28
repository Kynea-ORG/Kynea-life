-- 32. PROFILES — columna created_by + trigger handle_new_user actualizado.
--
-- `created_by` registra qué admin creó la cuenta desde /dashboard/admin
-- (lib/admin/actions.ts). NULL significa que la cuenta se registró sola
-- (flujo normal /registro, OAuth, /completar-registro); un uuid no-NULL
-- identifica al admin que la creó. No existe una columna `created_via`
-- separada — la procedencia se deriva únicamente de `created_by IS NOT NULL`.
--
-- ADVERTENCIA: `created_by` es procedencia informativa, NO un control de
-- seguridad. `raw_user_meta_data` lo controla el cliente (anon key) en
-- `supabase.auth.signUp`, así que un usuario autoregistrado puede enviar
-- cualquier uuid como `created_by`. El chequeo `is_admin` de abajo reduce
-- la falsificación (de "cualquier uuid" a "el uuid de un admin real"), pero
-- no la elimina: `profiles_select` es `USING (true)` (RLS pública) e
-- `is_admin` es legible por cualquiera, así que los uuids de admins son
-- enumerables. Nunca condicionar un privilegio o una policy a este campo.
ALTER TABLE public.profiles
  ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX profiles_created_by_idx
  ON public.profiles (created_by) WHERE created_by IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_created_by uuid;
BEGIN
  -- `created_by` sólo lo envía el módulo admin (lib/admin/actions.ts) vía
  -- user_metadata. Un registro normal nunca manda esta clave: `->>` devuelve
  -- NULL y la columna queda NULL = "se registró solo".
  BEGIN
    v_created_by := nullif(new.raw_user_meta_data->>'created_by', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    -- El metadata de signUp lo controla el cliente (anon key): un valor basura
    -- no debe abortar el INSERT en auth.users y romper el registro.
    v_created_by := NULL;
  END;

  -- Sólo se acepta la procedencia si el uuid declarado es realmente un admin.
  -- No es un control de seguridad (ver comentario de cabecera), sí reduce el
  -- ruido: un uuid arbitrario o de un usuario común se descarta.
  IF v_created_by IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_created_by AND p.is_admin
  ) THEN
    v_created_by := NULL;
  END IF;

  INSERT INTO public.profiles (id, name, role, created_by)
  VALUES (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name'
    ),
    new.raw_user_meta_data->>'role',
    v_created_by
  );
  RETURN new;
END;
$$;
