-- 47. classes.saved_count — mismo bug que views_count (migración 46): la
-- columna existe desde la migración 05 pero nada la incrementaba. A
-- diferencia de vistas/contactos (pings sueltos desde un clic en la UI),
-- guardar una clase ya es un evento de datos real — insert/delete en
-- saved_classes — así que un trigger que la mantenga sola es más robusto
-- que depender de que cada lugar que inserte/borre ahí se acuerde de
-- llamar un RPC aparte.
CREATE OR REPLACE FUNCTION public.sync_class_saved_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.classes SET saved_count = saved_count + 1 WHERE id = NEW.class_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.classes SET saved_count = GREATEST(saved_count - 1, 0) WHERE id = OLD.class_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER sync_class_saved_count_on_change
AFTER INSERT OR DELETE ON public.saved_classes
FOR EACH ROW EXECUTE FUNCTION public.sync_class_saved_count();

-- Backfill: pone saved_count en línea con las filas de saved_classes que ya
-- existían antes de este trigger (si no, sus guardados previos quedan sin
-- contar para siempre).
UPDATE public.classes c
SET saved_count = sub.cnt
FROM (
  SELECT class_id, count(*) AS cnt
  FROM public.saved_classes
  GROUP BY class_id
) sub
WHERE c.id = sub.class_id;
