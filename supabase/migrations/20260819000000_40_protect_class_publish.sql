-- 40. CLASSES — la transición a status = 'published' pasa por las mismas
-- reglas de negocio sin importar quién haga el UPDATE.
--
-- classes_update (10_rls_policies.sql) es `USING (teacher_id = auth.uid())`
-- sin WITH CHECK: cualquier profesor/academia dueño de una clase puede
-- hacer `supabase.from('classes').update({ status: 'published' })`
-- directamente con la anon key (pública en el bundle del cliente) y
-- saltarse por completo los guards de lib/classes/publishGuard.ts
-- (assertContactChannel, assertAcademiaApproved) — ambos corren solo del
-- lado de la app, antes de llamar a `update()`.
--
-- Este trigger corre a nivel de Postgres, no de RLS, así que cierra el
-- hueco sin importar qué cliente ejecute el UPDATE. Mismo patrón que
-- protect_profile_role() (migración 29) y protect_profile_is_admin()
-- (migración 31): procedural en vez de un WITH CHECK declarativo, para
-- poder devolver un mensaje de error legible en vez del genérico de RLS.
--
-- Replica exactamente las dos reglas de publishGuard.ts — si esas reglas
-- cambian, este trigger debe actualizarse junto con ellas.
CREATE OR REPLACE FUNCTION public.protect_class_publish()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_whatsapp  text;
  v_instagram text;
  v_role      text;
  v_approved  timestamptz;
BEGIN
  IF NEW.status IS DISTINCT FROM 'published' THEN
    RETURN NEW;
  END IF;

  SELECT whatsapp, instagram, role, academia_approved_at
  INTO v_whatsapp, v_instagram, v_role, v_approved
  FROM public.profiles WHERE id = NEW.teacher_id;

  -- Espejo de missingContactChannels() en publishGuard.ts.
  IF NEW.contact_mode IN ('whatsapp', 'both') AND (v_whatsapp IS NULL OR btrim(v_whatsapp) = '') THEN
    RAISE EXCEPTION 'Agrega tu WhatsApp en tu perfil para poder publicar esta clase.';
  END IF;
  IF NEW.contact_mode IN ('instagram', 'both') AND (v_instagram IS NULL OR btrim(v_instagram) = '') THEN
    RAISE EXCEPTION 'Agrega tu Instagram en tu perfil para poder publicar esta clase.';
  END IF;

  -- Espejo de assertAcademiaApproved() en publishGuard.ts.
  IF v_role = 'academia' AND v_approved IS NULL THEN
    RAISE EXCEPTION 'Tu academia todavía está en revisión — puedes guardar como borrador mientras tanto.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_class_publish_on_update
  BEFORE INSERT OR UPDATE OF status ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.protect_class_publish();
