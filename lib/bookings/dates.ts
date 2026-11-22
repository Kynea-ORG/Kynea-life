import type { CancellationPolicy } from './types';

// Fechas de reservas. Las clases son de Lima (UTC-5, sin horario de verano), igual que las RPC
// de la migración 70, así que aquí se trabaja con ese desfase fijo y no con la zona del navegador.

const LIMA_OFFSET_HOURS = 5;
const MS_PER_DAY = 86_400_000;

/** Plazo fijo (horas tras el fin de la clase en Lima) para el autocierre de "Por cerrar". */
export const BOOKING_AUTO_CLOSE_HOURS = 48;

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

/** Fecha larga en español: "lunes, 23 de noviembre" (estable entre SSR UTC y cualquier navegador). */
export function formatLongDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}

/** Fecha corta en español: "sáb, 21 nov" (para filas compactas de fechas). */
export function formatShortDate(date: string): string {
  return new Date(`${date}T12:00:00Z`)
    .toLocaleDateString('es-PE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    })
    .replace(/\./g, '');
}

/** Día de la semana ISO (0 = lunes … 6 = domingo) para una fecha YYYY-MM-DD. */
export function isoWeekday(date: string): number {
  return (new Date(toUtcDay(date)).getUTCDay() + 6) % 7;
}

/**
 * Elige el horario inicial de una clase en modo 'class' igual que `_class_initial_start_time` en SQL:
 * prioriza el horario del día de la semana de `startDate`, luego el menor `day_of_week` y menor `start_time`.
 */
export function pickInitialSchedule<T extends { day_of_week?: number; dayOfWeek?: number; start_time?: string; startTime?: string }>(
  schedules: readonly T[] | null | undefined,
  startDate?: string | null,
): T | undefined {
  if (!schedules?.length) return undefined;
  const targetDay = startDate ? isoWeekday(startDate) : null;
  const dayOf = (s: T) => s.day_of_week ?? s.dayOfWeek ?? 99;
  const timeOf = (s: T) => s.start_time ?? s.startTime ?? '99:99';
  return [...schedules].sort((a, b) => {
    const aMatch = targetDay !== null && dayOf(a) === targetDay ? 0 : 1;
    const bMatch = targetDay !== null && dayOf(b) === targetDay ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    if (dayOf(a) !== dayOf(b)) return dayOf(a) - dayOf(b);
    return timeOf(a).localeCompare(timeOf(b));
  })[0];
}

const POLICY_HOURS: Record<CancellationPolicy, number> = { flexible: 24, moderada: 48, estricta: 168 };

/** Instante de Lima (YYYY-MM-DD + HH:MM) como Date UTC. */
export function limaToDate(date: string, time = '00:00'): Date {
  const [h, min] = time.split(':').map(Number);
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, h + LIMA_OFFSET_HOURS, min));
}

/** Fecha calendario YYYY-MM-DD en hora Lima (UTC-5) para un instante dado. */
export function toLimaDateString(now: Date | string = new Date()): string {
  const d = typeof now === 'string' ? new Date(now) : now;
  return new Date(d.getTime() - LIMA_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10);
}

/**
 * Indica si ya llegó o pasó la hora de inicio (hora Lima) de una fecha/clase.
 * Sin hora, solo considera pasada si la fecha es estrictamente anterior a hoy (Lima).
 */
export function hasStartPassedLima(
  date: string,
  startTime: string | undefined,
  now = new Date(),
): boolean {
  if (startTime) {
    return now.getTime() >= limaToDate(date, startTime).getTime();
  }
  const todayLima = new Date(now.getTime() - LIMA_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10);
  return date < todayLima;
}

/**
 * Indica si ya terminó una sesión o clase (hora Lima) respecto a `today` y `now`:
 * - Día estrictamente anterior a `today` → true.
 * - Día posterior a `today` → false.
 * - Mismo día (`today`):
 *   - Con `endTime`: true si `now >= endDate + endTime` (maneja cruce de medianoche si `endTime < startTime`).
 *   - Sin `endTime` pero con `startTime`: true si `now >= endDate + startTime + 1h`.
 *   - Sin horario alguno: false (pasa al cambiar de día).
 */
export function hasClassEndedLima(
  endDate: string,
  endTime: string | undefined,
  startTime: string | undefined,
  today: string,
  now?: Date | string,
): boolean {
  const diff = daysUntil(endDate, today);
  if (diff < 0) return true;
  if (diff > 0) return false;
  if (!endTime && !startTime) return false;

  const nowDate = now !== undefined ? (typeof now === 'string' ? new Date(now) : now) : new Date();
  if (Number.isNaN(nowDate.getTime())) return false;

  // Si `now` no fue pasado explícitamente (ej. tests legacy con `today` sintético),
  // solo evaluamos la hora cuando el reloj actual corresponde al mismo día Lima.
  if (now === undefined) {
    const nowLimaDate = new Date(nowDate.getTime() - LIMA_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10);
    if (nowLimaDate !== today) return false;
  }

  const endMs = classEndDateLima(endDate, endTime, startTime).getTime();
  return nowDate.getTime() >= endMs;
}

/**
 * Instante UTC en que termina una sesión o clase en hora Lima.
 * Coincide con `hasClassEndedLima` y `auto_close_past_bookings` en SQL:
 * - Con `endTime`: `endDate + endTime` (suma 1 día si cruza medianoche `endTime < startTime`).
 * - Sin `endTime`, con `startTime`: `endDate + startTime + 1h`.
 * - Sin horarios: `endDate + 23:59`.
 */
export function classEndDateLima(
  endDate: string,
  endTime: string | undefined,
  startTime: string | undefined,
): Date {
  if (endTime) {
    let endMs = limaToDate(endDate, endTime).getTime();
    if (startTime && endTime < startTime) {
      endMs += MS_PER_DAY;
    }
    return new Date(endMs);
  }
  if (startTime) {
    return new Date(limaToDate(endDate, startTime).getTime() + 60 * 60_000);
  }
  return limaToDate(endDate, '23:59');
}

export interface AutoCloseCountdown {
  /** Milisegundos restantes hasta el autocierre (0 si ya se cumplió el plazo). */
  remainingMs: number;
  /** true si ya pasaron las 48h y espera la próxima corrida horaria del cron. */
  overdue: boolean;
  /** Etiqueta para la cabecera de la sesión: "Se cierra en 1 d 18 h" / "Se cierra en 14 h" / "Se cierra en 45 min" / "Cierre automático pendiente". */
  label: string;
  /** Etiqueta compacta para la lista izquierda: "1 d 18 h" / "14 h" / "45 min" / "Cierre pronto". */
  shortLabel: string;
  /** true cuando quedan menos de 6 horas o ya venció el plazo. */
  urgent: boolean;
}

/**
 * Calcula cuánto falta para el cierre automático de una clase/sesión en "Por cerrar"
 * (`finDeClaseEnLima + BOOKING_AUTO_CLOSE_HOURS` respecto a `now`).
 */
export function autoCloseCountdown(
  endDate: string,
  endTime: string | undefined,
  startTime: string | undefined,
  now: Date | string = new Date(),
  graceHours = BOOKING_AUTO_CLOSE_HOURS,
): AutoCloseCountdown | null {
  const nowDate = typeof now === 'string' ? new Date(now) : now;
  if (Number.isNaN(nowDate.getTime())) return null;

  const endMs = classEndDateLima(endDate, endTime, startTime).getTime();
  const closeAtMs = endMs + graceHours * 3_600_000;
  const remainingMs = Math.max(0, closeAtMs - nowDate.getTime());

  if (remainingMs <= 0) {
    return {
      remainingMs: 0,
      overdue: true,
      label: 'Cierre automático pendiente',
      shortLabel: 'Cierre pronto',
      urgent: true,
    };
  }

  const urgent = remainingMs < 6 * 3_600_000;
  if (remainingMs < 3_600_000) {
    const mins = Math.max(1, Math.min(59, Math.ceil(remainingMs / 60_000)));
    const shortLabel = `${mins} min`;
    return {
      remainingMs,
      overdue: false,
      label: `Se cierra en ${shortLabel}`,
      shortLabel,
      urgent,
    };
  }

  const totalHours = Math.floor(remainingMs / 3_600_000);
  if (totalHours < 24) {
    const shortLabel = `${totalHours} h`;
    return {
      remainingMs,
      overdue: false,
      label: `Se cierra en ${shortLabel}`,
      shortLabel,
      urgent,
    };
  }

  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const shortLabel = hours > 0 ? `${days} d ${hours} h` : `${days} d`;
  return {
    remainingMs,
    overdue: false,
    label: `Se cierra en ${shortLabel}`,
    shortLabel,
    urgent,
  };
}

/** Hasta cuándo puede cancelar el alumno según la política de la clase. */
export function cancellationDeadline(date: string, startTime: string | undefined, policy: CancellationPolicy): Date {
  const start = limaToDate(date, startTime);
  return new Date(start.getTime() - POLICY_HOURS[policy] * 3_600_000);
}

/** Fecha y hora límite formateadas en hora Lima: "21 de noviembre a las 19:00". */
export function formatDeadlineLima(deadline: Date): string {
  const day = deadline.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Lima',
  });
  const time = deadline.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Lima',
  });
  return `${day} a las ${time}`;
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
    `UID:${uid}@kynea.dance`,
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
