-- ── 8. RPC: Incrementar contactos ───────────────────────────────────────────
-- SECURITY DEFINER para saltarse RLS en el UPDATE del contador.

CREATE OR REPLACE FUNCTION public.increment_class_contacts(target_class_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.classes
  SET contacts_count = contacts_count + 1
  WHERE id = target_class_id AND status = 'published';
$$;


-- ── 9. RPC: Proveedor de registro de un email ───────────────────────────────
-- SECURITY DEFINER para leer auth.identities (no accesible al rol anon/authenticated).
-- Devuelve 'email' | 'google' | 'none'.
-- Si la cuenta tiene ambos proveedores (email + Google vinculados), 'email' tiene prioridad.

CREATE OR REPLACE FUNCTION public.email_signup_provider(p_email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  has_password boolean;
  has_google   boolean;
BEGIN
  SELECT bool_or(i.provider = 'email'), bool_or(i.provider = 'google')
  INTO has_password, has_google
  FROM auth.identities i
  JOIN auth.users u ON u.id = i.user_id
  WHERE lower(u.email) = lower(p_email);

  IF has_password THEN RETURN 'email';
  ELSIF has_google THEN RETURN 'google';
  ELSE RETURN 'none';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.email_signup_provider(text) TO anon, authenticated;
