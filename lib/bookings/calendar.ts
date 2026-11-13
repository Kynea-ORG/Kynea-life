import type { MyBooking } from './types';

// Calendario mensual de "Mis reservas": convierte las reservas del alumno en eventos por día.
// Todo se calcula con fechas YYYY-MM-DD en UTC para que no dependa de la zona del navegador.

export interface CalendarCell { date: string; inMonth: boolean }
export interface BookingOccurrence { date: string; startTime?: string; endTime?: string }
export interface CalendarEntry {
  bookingId: string;
  classId: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  place?: string;
  status: MyBooking['status'];
  teacherName?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
/** Lunes = 0 … domingo = 6, igual que class_schedules.day_of_week. */
const weekday = (d: Date) => (d.getUTCDay() + 6) % 7;
const MAX_COURSE_DAYS = 400;

/** Semanas (lunes a domingo) que cubren el mes. `month` va de 0 a 11. */
export function buildMonthGrid(year: number, month: number): CalendarCell[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const start = new Date(first);
  start.setUTCDate(1 - weekday(first));
  const weeks: CalendarCell[][] = [];
  const cursor = new Date(start);
  do {
    const week: CalendarCell[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({ date: iso(cursor), inMonth: cursor.getUTCMonth() === month });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  } while (cursor.getUTCMonth() === month);
  return weeks;
}

export function monthTitle(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 1, 12)).toLocaleDateString('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Días concretos en que ocurre una reserva: su fecha, o cada día de clase de un curso. */
export function bookingOccurrences(b: MyBooking): BookingOccurrence[] {
  if (b.session) return [{ date: b.session.date, startTime: b.session.startTime, endTime: b.session.endTime }];
  const { startDate, endDate, days, startTime, endTime } = b.class;
  if (!startDate) return [];
  const single = [{ date: startDate, startTime, endTime }];
  if (!endDate || endDate <= startDate || days.length === 0) return single;

  const out: BookingOccurrence[] = [];
  const cursor = parse(startDate);
  const last = parse(endDate);
  for (let i = 0; i < MAX_COURSE_DAYS && cursor <= last; i++) {
    if (days.includes(weekday(cursor))) out.push({ date: iso(cursor), startTime, endTime });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out.length ? out : single;
}

const SHOWN = new Set(['hold', 'pending_payment', 'confirmed', 'attended']);

/** Eventos del calendario por día (YYYY-MM-DD), ordenados por hora. No incluye reservas canceladas. */
export function eventsByDate(bookings: MyBooking[]): Map<string, CalendarEntry[]> {
  const map = new Map<string, CalendarEntry[]>();
  for (const b of bookings) {
    if (!SHOWN.has(b.status)) continue;
    const place = [b.class.venueName, b.class.address].filter(Boolean).join(', ') || undefined;
    for (const o of bookingOccurrences(b)) {
      const list = map.get(o.date) ?? [];
      list.push({ bookingId: b.id, classId: b.class.id, title: b.class.title, date: o.date, startTime: o.startTime, endTime: o.endTime, place, status: b.status, teacherName: b.class.teacherName });
      map.set(o.date, list);
    }
  }
  for (const list of map.values()) list.sort((a, b) => (a.startTime ?? '99').localeCompare(b.startTime ?? '99'));
  return map;
}

/** Índice de color (0, 1, 2…) por clase. Sigue el orden de los ids para que no cambie de un mes a otro. */
export function assignClassColors(bookings: MyBooking[]): Map<string, number> {
  const ids = [...new Set(bookings.map(b => b.class.id))].sort();
  return new Map(ids.map((id, i) => [id, i]));
}

/** La primera clase desde `today` (inclusive) en adelante. */
export function nextEntry(events: Map<string, CalendarEntry[]>, today: string): CalendarEntry | undefined {
  const dates = [...events.keys()].filter(d => d >= today).sort();
  return dates.length ? events.get(dates[0])![0] : undefined;
}

export interface LegendItem { classId: string; title: string; colorIndex: number; count: number }

/** Clases que ocurren en el mes (month de 0 a 11), con su color y cuántas veces. */
export function monthLegend(events: Map<string, CalendarEntry[]>, colors: Map<string, number>, year: number, month: number): LegendItem[] {
  const prefix = `${year}-${pad(month + 1)}`;
  const byClass = new Map<string, LegendItem>();
  for (const [date, list] of events) {
    if (!date.startsWith(prefix)) continue;
    for (const e of list) {
      const item = byClass.get(e.classId) ?? { classId: e.classId, title: e.title, colorIndex: colors.get(e.classId) ?? 0, count: 0 };
      item.count += 1;
      byClass.set(e.classId, item);
    }
  }
  return [...byClass.values()].sort((a, b) => a.colorIndex - b.colorIndex);
}
