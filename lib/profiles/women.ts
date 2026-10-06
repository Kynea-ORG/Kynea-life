// lib/profiles/women.ts
//
// "Clases con profesoras": las profesoras las etiqueta un admin (profiles.is_woman,
// migración 63). Estas funciones degradan a "nadie etiquetado" si la columna todavía
// no existe en la base (migración sin aplicar) para no romper el Home ni /clases.
import type { SupabaseClient } from '@supabase/supabase-js';

export async function fetchWomanTeacherIds(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_woman', true)
    .eq('role', 'profesor');

  if (error) {
    // 42703 = columna inexistente (migración 63 pendiente): esperado, no es ruido.
    if (error.code !== '42703') console.error('[fetchWomanTeacherIds]', error.code, error.message);
    return [];
  }
  return (data ?? []).map((r: { id: string }) => r.id);
}

export function countClassesTaughtBy(
  classes: { teacher?: { id: string } }[],
  teacherIds: string[],
): number {
  if (teacherIds.length === 0) return 0;
  const ids = new Set(teacherIds);
  return classes.reduce((n, c) => (c.teacher && ids.has(c.teacher.id) ? n + 1 : n), 0);
}

/** La sección del Home solo aparece si hay clases de profesoras (nunca una sección vacía en
 *  producción). En desarrollo se muestra siempre para poder verla antes de etiquetar a nadie. */
export function shouldShowWomenSection(classCount: number, appEnv: string | undefined): boolean {
  return classCount > 0 || appEnv === 'development';
}
