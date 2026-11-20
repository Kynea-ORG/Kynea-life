import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Crea las fechas reservables de una clase "por fecha" a partir de su horario semanal
 * (RPC generate_class_sessions, migración 70). Idempotente; no hace nada en otros modos.
 * Mejor esfuerzo: si falla se registra, y el profesor puede volver a guardar la clase.
 */
export async function generateClassSessions(supabase: SupabaseClient, classId: string): Promise<void> {
  const { error } = await supabase.rpc('generate_class_sessions', { p_class_id: classId });
  if (error) console.error('[generateClassSessions]', classId, error.message);
}
