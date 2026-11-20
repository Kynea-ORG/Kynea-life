import { daysUntil } from './dates';
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
  /** null/undefined = sin límite. */
  capacity?: number;
  /** Cupos ocupados (activas + asistidas + no vinieron). */
  taken: number;
  daysAway: number | null;
  /** Días hasta el fin efectivo (endDate en cursos completos, sessionDate en sesiones). */
  endDaysAway: number | null;
  bookings: TeacherBooking[];
}

export interface GroupedBookings {
  upcoming: BookingGroup[];
  /** Fechas que ya pasaron y todavía tienen reservas por marcar (asistió / no vino). */
  toClose: BookingGroup[];
  history: BookingGroup[];
}

const OCCUPYING = new Set(['hold', 'pending_payment', 'confirmed', 'attended', 'no_show']);

/** Reúne las reservas por fecha (o por clase, si se reserva completa) y las separa por momento. */
export function groupTeacherBookings(bookings: TeacherBooking[], today: string): GroupedBookings {
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
        capacity: bk.capacity,
        taken: 0,
        daysAway: bk.sessionDate ? daysUntil(bk.sessionDate, today) : null,
        endDaysAway: effectiveEnd ? daysUntil(effectiveEnd, today) : null,
        bookings: [],
      };
      map.set(key, g);
    }
    g.bookings.push(bk);
    if (OCCUPYING.has(bk.status)) g.taken += bk.seats;
  }

  const upcoming: BookingGroup[] = [];
  const toClose: BookingGroup[] = [];
  const history: BookingGroup[] = [];
  for (const g of map.values()) {
    const isPast = g.endDaysAway !== null && g.endDaysAway < 0;
    if (!isPast) upcoming.push(g);
    else if (g.bookings.some(x => x.status === 'confirmed')) toClose.push(g);
    else history.push(g);
  }

  const asc = (a: BookingGroup, b: BookingGroup) => (a.date ?? '9999').localeCompare(b.date ?? '9999');
  upcoming.sort(asc);
  toClose.sort((a, b) => asc(b, a));
  history.sort((a, b) => asc(b, a));
  return { upcoming, toClose, history };
}

export function teacherSummary(g: GroupedBookings): { upcomingPeople: number; nextDate?: string; toClose: number } {
  return {
    upcomingPeople: g.upcoming.reduce((sum, x) => sum + x.taken, 0),
    nextDate: g.upcoming.find(x => x.date && x.taken > 0)?.date,
    toClose: g.toClose.length,
  };
}
