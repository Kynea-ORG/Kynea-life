-- ============================================================
-- 69 — class_access: el enlace de acceso online deja de ser público
--
-- PROBLEMA: `classes.access_link` (Zoom/Meet de las clases Online) estaba en la fila de
-- `classes`, que cualquiera puede leer cuando la clase está publicada (RLS pública + grant
-- SELECT a `anon`). La app solo lo ocultaba al mapear, pero con la anon key de Supabase se
-- podía leer el enlace de cualquier clase publicada. Con reservas pagadas, el enlace es
-- justo lo que se vende, así que no puede estar al alcance de todos.
--
-- SOLUCIÓN: tabla aparte con RLS propia. Solo el dueño de la clase y los admins la leen y
-- escriben. (Un REVOKE por columna no sirve: la app usa `SELECT *` sobre `classes`.)
--
-- DESPLIEGUE EN DOS PASOS, para no romper el código antiguo durante el despliegue:
--   1. Esta migración copia los enlaces a `class_access` y deja `classes.access_link` en NULL,
--      pero NO elimina la columna.
--   2. Una migración posterior (cuando el código nuevo ya esté en producción) hará
--      ALTER TABLE classes DROP COLUMN access_link.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.class_access (
  class_id    uuid PRIMARY KEY REFERENCES public.classes(id) ON DELETE CASCADE,
  access_link text NOT NULL CHECK (length(btrim(access_link)) > 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at_class_access ON public.class_access;
CREATE TRIGGER set_updated_at_class_access
  BEFORE UPDATE ON public.class_access
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.class_access ENABLE ROW LEVEL SECURITY;

-- El default de grants da SELECT a anon en toda tabla nueva; aquí no debe tener ninguno.
REVOKE ALL ON public.class_access FROM anon;

DROP POLICY IF EXISTS "class_access_select" ON public.class_access;
DROP POLICY IF EXISTS "class_access_insert" ON public.class_access;
DROP POLICY IF EXISTS "class_access_update" ON public.class_access;
DROP POLICY IF EXISTS "class_access_delete" ON public.class_access;

CREATE POLICY "class_access_select" ON public.class_access
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid())
  );

CREATE POLICY "class_access_insert" ON public.class_access
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid())
  );

CREATE POLICY "class_access_update" ON public.class_access
  FOR UPDATE USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid())
  );

CREATE POLICY "class_access_delete" ON public.class_access
  FOR DELETE USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid())
  );

-- Copia los enlaces existentes y vacía la columna pública (idempotente).
INSERT INTO public.class_access (class_id, access_link)
SELECT id, btrim(access_link)
FROM public.classes
WHERE access_link IS NOT NULL AND btrim(access_link) <> ''
ON CONFLICT (class_id) DO NOTHING;

UPDATE public.classes SET access_link = NULL WHERE access_link IS NOT NULL;

COMMENT ON COLUMN public.classes.access_link IS
  'DEPRECADA (migración 69): el enlace vive en public.class_access. Siempre NULL; se eliminará en una migración posterior.';
