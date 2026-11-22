import { daysUntil, hasClassEndedLima } from './dates';
import type { TeacherBooking } from './types';

export interface BookingGroup {
  key: string;
  classId: string;
  classTitle: string;
  classModality?: string;
  sessionId?: string;
  sessionStatus?: 'open' | 'cancelled';
  date?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  /** null/undefined = sin límite. */
  capacity?: number;
  /** Cupos ocupados (activas + pendientes + asistidas + no vinieron). */
  taken: number;
  /** Cantidad de reservas pendientes de confirmación en este grupo. */
  pendingCount: number;
  /** Cupos pendientes de confirmación en este grupo. */
  pendingSeats: number;
  daysAway: number | null;
  /** Días hasta el fin efectivo (endDate en cursos completos, sessionDate en sesiones). */
  endDaysAway: number | null;
  bookings: TeacherBooking[];
}

export interface GroupedBookings {
  upcoming: BookingGroup[];
  /** Fechas que ya terminaron (hora Lima) y todavía tienen reservas por confirmar o por marcar asistencia. */
  toClose: BookingGroup[];
  history: BookingGroup[];
}

export interface UpcomingClassGroup {
  classId: string;
  classTitle: string;
  classModality?: string;
  /** true si todas las entradas son reservas de clase completa (sin sessionId). */
  isWholeClass: boolean;
  /** Fechas/grupos ordenados ascendentemente por fecha y hora. */
  dates: BookingGroup[];
  /** Suma de cupos ocupados en todas las fechas próximas de esta clase. */
  totalTaken: number;
  /** Suma de solicitudes pendientes de confirmación en esta clase. */
  totalPendingCount: number;
  /** Fecha más próxima de esta clase (para ordenamiento entre tarjetas). */
  nextDate?: string;
}

const OCCUPYING = new Set(['hold', 'pending_payment', 'pending_confirmation', 'confirmed', 'attended', 'no_show']);

/**
 * Reúne las reservas por fecha (o por clase, si se reserva completa) y las separa por momento.
 * Opción B: una sesión o clase pasa de `upcoming` a `toClose` / `history` apenas termina su
 * `endTime` en `America/Lima` (fallback: `startTime + 1h`, o cambio de día si no tiene horario).
 */
export function groupTeacherBookings(
  bookings: TeacherBooking[],
  today: string,
  now?: Date | string,
): GroupedBookings {
  const map = new Map<string, BookingGroup>();
  for (const bk of bookings) {
    const key = `${bk.classId}|${bk.sessionId ?? 'class'}`;
    let g = map.get(key);
    if (!g) {
      const effectiveEnd = bk.sessionId ? bk.sessionDate : (bk.classEndDate ?? bk.sessionDate);
      g = {
        key,
        classId: bk.classId,
        classTitle: bk.classTitle,
        classModality: bk.classModality,
        sessionId: bk.sessionId,
        sessionStatus: bk.sessionStatus,
        date: bk.sessionDate,
        endDate: bk.sessionId ? undefined : bk.classEndDate,
        startTime: bk.startTime,
        endTime: bk.endTime,
        capacity: bk.capacity,
        taken: 0,
        pendingCount: 0,
        pendingSeats: 0,
        daysAway: bk.sessionDate ? daysUntil(bk.sessionDate, today) : null,
        endDaysAway: effectiveEnd ? daysUntil(effectiveEnd, today) : null,
        bookings: [],
      };
      map.set(key, g);
    }
    g.bookings.push(bk);
    if (OCCUPYING.has(bk.status)) g.taken += bk.seats;
    if (bk.status === 'pending_confirmation') {
      g.pendingCount += 1;
      g.pendingSeats += bk.seats;
    }
  }

  const upcoming: BookingGroup[] = [];
  const toClose: BookingGroup[] = [];
  const history: BookingGroup[] = [];
  for (const g of map.values()) {
    const effectiveEnd = g.sessionId ? g.date : (g.endDate ?? g.date);
    const hasEnded = effectiveEnd
      ? hasClassEndedLima(effectiveEnd, g.endTime, g.startTime, today, now)
      : false;
    if (!hasEnded) upcoming.push(g);
    else if (g.bookings.some(x => x.status === 'confirmed' || x.status === 'pending_confirmation')) toClose.push(g);
    else history.push(g);
  }

  const asc = (a: BookingGroup, b: BookingGroup) => {
    const dateCmp = (a.date ?? '9999').localeCompare(b.date ?? '9999');
    if (dateCmp !== 0) return dateCmp;
    const startCmp = (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99');
    if (startCmp !== 0) return startCmp;
    return (a.endTime ?? '99:99').localeCompare(b.endTime ?? '99:99');
  };
  upcoming.sort(asc);
  toClose.sort(asc);
  history.sort((a, b) => asc(b, a));
  return { upcoming, toClose, history };
}

/**
 * Agrupa las fechas próximas por `classId` para mostrar 1 tarjeta por clase (Clase → Fechas)
 * ordenada por la fecha próxima más cercana.
 */
export function groupUpcomingByClass(upcoming: BookingGroup[]): UpcomingClassGroup[] {
  const byClass = new Map<string, UpcomingClassGroup>();
  for (const g of upcoming) {
    let cls = byClass.get(g.classId);
    if (!cls) {
      cls = {
        classId: g.classId,
        classTitle: g.classTitle,
        classModality: g.classModality,
        isWholeClass: !g.sessionId,
        dates: [],
        totalTaken: 0,
        totalPendingCount: 0,
        nextDate: g.date,
      };
      byClass.set(g.classId, cls);
    }
    cls.dates.push(g);
    if (g.sessionId) cls.isWholeClass = false;
    cls.totalTaken += g.taken;
    cls.totalPendingCount += g.pendingCount;
    if (g.date && (!cls.nextDate || g.date < cls.nextDate)) {
      cls.nextDate = g.date;
    }
  }

  return [...byClass.values()].sort((a, b) => {
    const dateCmp = (a.nextDate ?? '9999').localeCompare(b.nextDate ?? '9999');
    if (dateCmp !== 0) return dateCmp;
    return a.classTitle.localeCompare(b.classTitle);
  });
}

export function teacherSummary(g: GroupedBookings): {
  upcomingPeople: number;
  nextDate?: string;
  toClose: number;
  pendingCount: number;
} {
  const pendingCount = [...g.upcoming, ...g.toClose].reduce((sum, x) => sum + x.pendingCount, 0);
  return {
    upcomingPeople: g.upcoming.reduce((sum, x) => sum + x.taken, 0),
    nextDate: g.upcoming.find(x => x.date && x.taken > 0)?.date,
    toClose: g.toClose.length,
    pendingCount,
  };
}
