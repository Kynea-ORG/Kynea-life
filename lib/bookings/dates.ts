import type { CancellationPolicy } from './types';

// Fechas de reservas. Las clases son de Lima (UTC-5, sin horario de verano), igual que las RPC
// de la migración 70, así que aquí se trabaja con ese desfase fijo y no con la zona del navegador.

const LIMA_OFFSET_HOURS = 5;
const MS_PER_DAY = 86_400_000;

function toUtcDay(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Suma `days` días calendario a una fecha YYYY-MM-DD. */
export function addDays(date: string, days: number): string {
  return new Date(toUtcDay(date) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Días calendario que faltan desde `today` (YYYY-MM-DD) hasta `date`. Negativo si ya pasó. */
export function daysUntil(date: string, today: string): number {
  return Math.round((toUtcDay(date) - toUtcDay(today)) / MS_PER_DAY);
}

export function countdownLabel(days: number): string {
  if (days < 0) return 'Finalizada';
  if (days === 0) return 'Es hoy';
  if (days === 1) return 'Es mañana';
  return `Faltan ${days} días`;
}

/**
 * Estado temporal de una clase de "reserva completa" (curso, taller, evento): faltan N días,
 * está en curso (ya empezó y aún no termina) o finalizó. Sin fecha de fin, termina al iniciar.
 */
export function classTimingLabel(startDate: string, endDate: string | undefined, today: string): string {
  const toStart = daysUntil(startDate, today);
  if (toStart >= 0) return countdownLabel(toStart);
  return daysUntil(endDate ?? startDate, today) >= 0 ? 'En curso' : 'Finalizada';
}

/** Fecha larga en español: "lunes, 23 de noviembre". */
export function formatLongDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
}

const POLICY_HOURS: Record<CancellationPolicy, number> = { flexible: 24, moderada: 48, estricta: 168 };

/** Instante de Lima (YYYY-MM-DD + HH:MM) como Date UTC. */
function limaToDate(date: string, time = '00:00'): Date {
  const [h, min] = time.split(':').map(Number);
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, h + LIMA_OFFSET_HOURS, min));
}

/** Hasta cuándo puede cancelar el alumno según la política de la clase. */
export function cancellationDeadline(date: string, startTime: string | undefined, policy: CancellationPolicy): Date {
  const start = limaToDate(date, startTime);
  return new Date(start.getTime() - POLICY_HOURS[policy] * 3_600_000);
}

export function canStillCancel(date: string, startTime: string | undefined, policy: CancellationPolicy, now = new Date()): boolean {
  return now.getTime() <= cancellationDeadline(date, startTime, policy).getTime();
}

export interface CalendarEvent {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  details?: string;
}

const compact = (date: string, time: string) => `${date.replaceAll('-', '')}T${time.replace(':', '')}00`;

export function googleCalendarUrl(ev: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${compact(ev.date, ev.startTime)}/${compact(ev.date, ev.endTime)}`,
    ctz: 'America/Lima',
  });
  if (ev.location) params.set('location', ev.location);
  if (ev.details) params.set('details', ev.details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const icsUtc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Archivo .ics (funciona con Apple Calendar, Outlook y Google). */
export function buildIcs(ev: CalendarEvent, uid: string): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kynea//Reservas//ES',
    'BEGIN:VEVENT',
    `UID:${uid}@kynea.life`,
    `DTSTAMP:${icsUtc(new Date())}`,
    `DTSTART:${icsUtc(limaToDate(ev.date, ev.startTime))}`,
    `DTEND:${icsUtc(limaToDate(ev.date, ev.endTime))}`,
    `SUMMARY:${icsText(ev.title)}`,
    ...(ev.location ? [`LOCATION:${icsText(ev.location)}`] : []),
    ...(ev.details ? [`DESCRIPTION:${icsText(ev.details)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}
