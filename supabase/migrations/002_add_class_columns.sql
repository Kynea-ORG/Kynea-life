-- Columnas que createClass/updateClassFromForm ya intentan escribir pero no existían
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS offer_price  numeric(10,2);
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS contact_mode text NOT NULL DEFAULT 'whatsapp';

-- Incrementa el contador de contactos sin race condition, bypassando RLS
CREATE OR REPLACE FUNCTION increment_class_contacts(class_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.classes
  SET contacts = contacts + 1
  WHERE id = class_id AND status = 'published';
$$;
