import type { SupabaseClient } from '@supabase/supabase-js';
import type { BookingMode } from './types';

// Guardas de edición/borrado de clases con reservas. La base de datos las aplica también
// (migración 72), pero la app las revisa ANTES de reescribir horarios y estilos para no dejar
// un guardado a medias.

export interface BookingStats {
  total: number;
  /** Reservas que aún ocupan cupo y se pueden cancelar (hold, pending_payment, confirmed). */
  active: number;
  /** Cupos ocupados en modo "clase completa" (no cuenta reservas por fecha). */
  classSeatsTaken: number;
}

interface BookingStatRow { status: string; seats: number; session_id: string | null }

const ACTIVE = ['hold', 'pending_payment', 'confirmed'];
const OCCUPYING = [...ACTIVE, 'attended', 'no_show'];

export function summarizeBookings(rows: BookingStatRow[]): BookingStats {
  return {
    total: rows.length,
    active: rows.filter(r => ACTIVE.includes(r.status)).length,
    classSeatsTaken: rows
      .filter(r => r.session_id === null && OCCUPYING.includes(r.status))
      .reduce((sum, r) => sum + r.seats, 0),
  };
}

export type GuardCode = 'HAS_ACTIVE_BOOKINGS' | 'CAPACITY_BELOW_BOOKINGS';

export const GUARD_MESSAGES: Record<GuardCode, string> = {
  HAS_ACTIVE_BOOKINGS: 'Esta clase tiene reservas activas: cancélalas antes de cambiar el modo de reserva.',
  CAPACITY_BELOW_BOOKINGS: 'No puedes bajar los cupos por debajo de los que ya están reservados.',
};

export function checkClassEditGuard(input: {
  currentMode: BookingMode;
  newMode: BookingMode;
  newMaxSpots: number | null;
  stats: BookingStats;
}): { ok: true } | { ok: false; code: GuardCode } {
  const { currentMode, newMode, newMaxSpots, stats } = input;
  if (currentMode !== newMode && stats.active > 0) return { ok: false, code: 'HAS_ACTIVE_BOOKINGS' };
  if (newMode === 'class' && newMaxSpots !== null && newMaxSpots < stats.classSeatsTaken) {
    return { ok: false, code: 'CAPACITY_BELOW_BOOKINGS' };
  }
  return { ok: true };
}

/** Motivo por el que no se puede borrar la clase (null = se puede). */
export function deleteBlockedReason(stats: BookingStats): string | null {
  if (stats.active > 0) return 'Esta clase tiene reservas activas. Cancela primero las reservas y luego podrás eliminarla.';
  if (stats.total > 0) return 'Esta clase tiene historial de reservas y no se puede eliminar. Mejor archívala para ocultarla.';
  return null;
}

/** Lee las reservas de una clase (la RLS deja ver las de las clases propias). */
export async function loadBookingStats(supabase: SupabaseClient, classId: string): Promise<BookingStats> {
  const { data } = await supabase.from('bookings').select('status, seats, session_id').eq('class_id', classId);
  return summarizeBookings((data ?? []) as BookingStatRow[]);
}

/** Traduce el error de los triggers de la migración 72 a un texto para el profesor. */
export function translateGuardError(message: string | undefined): string | null {
  const code = (Object.keys(GUARD_MESSAGES) as GuardCode[]).find(c => message?.includes(c));
  return code ? GUARD_MESSAGES[code] : null;
}
