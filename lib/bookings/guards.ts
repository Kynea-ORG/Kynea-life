import type { SupabaseClient } from '@supabase/supabase-js';
import { getTodayLima } from '@/lib/classes/helpers';
import type { BookingMode } from './types';

// Guardas de edición/borrado de clases con reservas. La base de datos las aplica también
// (migraciones 72 / 76 / 79), pero la app las revisa ANTES de reescribir horarios y estilos
// para no dejar un guardado a medias.

export interface BookingStats {
  total: number;
  /** Reservas vigentes que aún ocupan cupo y se pueden cancelar (hold, pending_payment, pending_confirmation, confirmed). */
  active: number;
  /** Cupos ocupados en modo "clase completa" (no cuenta reservas por fecha). */
  classSeatsTaken: number;
}

interface BookingStatRow {
  status: string;
  seats: number;
  session_id: string | null;
  effective_date?: string | null;
  session?: { session_date?: string | null } | { session_date?: string | null }[] | null;
  class?: { start_date?: string | null; end_date?: string | null } | { start_date?: string | null; end_date?: string | null }[] | null;
}

const ACTIVE = ['hold', 'pending_payment', 'pending_confirmation', 'confirmed'];
const OCCUPYING = [...ACTIVE, 'attended', 'no_show'];

function rowEffectiveDate(r: BookingStatRow): string | null {
  if (r.effective_date !== undefined) return r.effective_date;
  const sess = Array.isArray(r.session) ? r.session[0] : r.session;
  const cls = Array.isArray(r.class) ? r.class[0] : r.class;
  return sess?.session_date ?? cls?.end_date ?? cls?.start_date ?? null;
}

export function summarizeBookings(rows: BookingStatRow[], today?: string): BookingStats {
  const active = rows.filter(r => {
    if (!ACTIVE.includes(r.status)) return false;
    if (!today) return true;
    const eff = rowEffectiveDate(r);
    return !eff || eff >= today;
  }).length;

  return {
    total: rows.length,
    active,
    classSeatsTaken: rows
      .filter(r => r.session_id === null && OCCUPYING.includes(r.status))
      .reduce((sum, r) => sum + r.seats, 0),
  };
}

export type GuardCode = 'HAS_ACTIVE_BOOKINGS' | 'CAPACITY_BELOW_BOOKINGS';

export const GUARD_MESSAGES: Record<GuardCode, string> = {
  HAS_ACTIVE_BOOKINGS: 'Esta clase tiene reservas activas o por confirmar: cancélalas antes de cambiar el modo de reserva.',
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
  if (stats.active > 0) return 'Esta clase tiene reservas activas o por confirmar. Cancela primero las reservas y luego podrás eliminarla.';
  if (stats.total > 0) return 'Esta clase tiene historial de reservas y no se puede eliminar. Mejor archívala para ocultarla.';
  return null;
}

/** Lee las reservas de una clase (la RLS deja ver las de las clases propias). */
export async function loadBookingStats(supabase: SupabaseClient, classId: string): Promise<BookingStats> {
  const { data } = await supabase
    .from('bookings')
    .select('status, seats, session_id, session:class_sessions(session_date), class:classes(start_date, end_date)')
    .eq('class_id', classId);
  return summarizeBookings((data ?? []) as BookingStatRow[], getTodayLima());
}

/** Traduce el error de los triggers de las migraciones 72/79 a un texto para el profesor. */
export function translateGuardError(message: string | undefined): string | null {
  const code = (Object.keys(GUARD_MESSAGES) as GuardCode[]).find(c => message?.includes(c));
  return code ? GUARD_MESSAGES[code] : null;
}
