import type { SupabaseClient } from '@supabase/supabase-js';

// El enlace de acceso de una clase Online (Zoom, Meet…) vive en `class_access`, no en `classes`:
// la fila de `classes` es legible por cualquiera (clases publicadas), y el enlace solo debe verlo
// el dueño de la clase y los admins. La RLS de `class_access` lo garantiza.

/** Guarda el enlace de acceso de la clase; sin enlace borra la fila. */
export async function syncClassAccess(
  supabase: SupabaseClient,
  classId: string,
  accessLink: string | null | undefined,
): Promise<void> {
  const link = accessLink?.trim();
  if (link) {
    const { error } = await supabase
      .from('class_access')
      .upsert({ class_id: classId, access_link: link }, { onConflict: 'class_id' });
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from('class_access').delete().eq('class_id', classId);
  if (error) throw new Error(error.message);
}

/** Lee el enlace de acceso. Devuelve null si no existe o si la RLS no deja verlo. */
export async function fetchClassAccessLink(
  supabase: SupabaseClient,
  classId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('class_access')
    .select('access_link')
    .eq('class_id', classId)
    .maybeSingle();
  return (data as { access_link: string | null } | null)?.access_link ?? null;
}

/** Copia el enlace de acceso de una clase a su copia (duplicar o copias de serie). */
export async function copyClassAccess(
  supabase: SupabaseClient,
  fromClassId: string,
  toClassId: string,
): Promise<void> {
  const link = await fetchClassAccessLink(supabase, fromClassId);
  if (link) await syncClassAccess(supabase, toClassId, link);
}
