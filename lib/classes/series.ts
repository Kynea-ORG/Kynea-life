// lib/classes/series.ts
//
// Series de clases mensuales: una clase Mensual (inicio, fin, días, horas) que el
// profesor repite en otros meses del año. Cada mes es una copia independiente
// (borrador) que se publica sola 14 días antes de su inicio.
//
// Módulo puro (sin imports de servidor) para usarlo también en Client Components.
// Las fechas son strings 'YYYY-MM-DD' y los meses 'YYYY-MM'; se opera con enteros
// para no depender de la zona horaria del servidor o del navegador.

export const MAX_SERIES_MONTHS = 11;
export const AUTO_PUBLISH_LEAD_DAYS = 14;

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_RE = /^(\d{4})-(\d{2})$/;

/** Índice absoluto de mes (año*12 + mes0) o null si el formato no es válido. */
function monthIndex(ym: string): number | null {
  const m = MONTH_RE.exec(ym);
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return Number(m[1]) * 12 + (month - 1);
}

function indexToMonth(idx: number): string {
  const year = Math.floor(idx / 12);
  const month = (idx % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

function parseDate(d: string): { y: number; m: number; day: number } | null {
  const m = DATE_RE.exec(d);
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { y: Number(m[1]), m: month, day: Number(m[3]) };
}

function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

function fmt(y: number, m1: number, day: number): string {
  return `${y}-${String(m1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Meses ofrecibles para copias: posteriores al mes inicial, no pasados y dentro de 12 meses desde hoy. */
export function listSelectableMonths(today: string, startDate: string): string[] {
  const start = parseDate(startDate);
  const now = parseDate(today);
  if (!start || !now) return [];

  const startIdx = start.y * 12 + (start.m - 1);
  const nowIdx = now.y * 12 + (now.m - 1);
  const first = Math.max(startIdx + 1, nowIdx);
  const last = nowIdx + 11;

  const months: string[] = [];
  for (let i = first; i <= last && months.length < MAX_SERIES_MONTHS; i++) months.push(indexToMonth(i));
  return months;
}

/** Mueve el ciclo [start, end] a `targetMonth` conservando los días y la duración en meses.
 *  Si el día no existe en el mes destino (30 → febrero) se recorta al último día del mes. */
export function shiftToMonth(
  startDate: string,
  endDate: string,
  targetMonth: string,
): { startDate: string; endDate: string } {
  const s = parseDate(startDate);
  const e = parseDate(endDate);
  const target = monthIndex(targetMonth);
  if (!s || !e || target === null) throw new Error('Fechas o mes inválidos');

  const monthsSpan = (e.y * 12 + (e.m - 1)) - (s.y * 12 + (s.m - 1));
  const place = (idx: number, day: number) => {
    const y = Math.floor(idx / 12);
    const m1 = (idx % 12) + 1;
    return fmt(y, m1, Math.min(day, daysInMonth(y, m1)));
  };

  return { startDate: place(target, s.day), endDate: place(target + monthsSpan, e.day) };
}

/** Fecha en la que la copia se publica sola: 14 días antes de su inicio. */
export function autoPublishDate(startDate: string): string {
  const s = parseDate(startDate);
  if (!s) throw new Error('Fecha inválida');
  const d = new Date(Date.UTC(s.y, s.m - 1, s.day));
  d.setUTCDate(d.getUTCDate() - AUTO_PUBLISH_LEAD_DAYS);
  return fmt(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Valida el JSON de `seriesMonths` que llega del formulario. Nunca lanza: lo inválido se descarta. */
export function parseSeriesMonths(raw: string | null | undefined, today: string, startDate: string): string[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const allowed = new Set(listSelectableMonths(today, startDate));
  const unique = new Set<string>();
  for (const v of parsed) if (typeof v === 'string' && allowed.has(v)) unique.add(v);
  return [...unique].sort().slice(0, MAX_SERIES_MONTHS);
}

/** '2026-05' → 'Mayo 2026' (o 'May' con { short: true }). */
export function monthLabel(ym: string, opts?: { short?: boolean }): string {
  const idx = monthIndex(ym);
  if (idx === null) return ym;
  const month0 = idx % 12;
  return opts?.short ? MONTH_SHORT[month0] : `${MONTH_NAMES[month0]} ${Math.floor(idx / 12)}`;
}

/** "Hoy" en Lima (America/Lima, UTC−5 sin horario de verano) como 'YYYY-MM-DD'.
 *  Misma regla que getTodayLima() de helpers.ts, que no se puede importar desde el
 *  cliente (arrastra código de servidor). */
export function limaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(now);
}

/** Los 12 meses visibles en el calendario: desde el mes de `today`, 12 seguidos. */
export function calendarWindow(today: string): string[] {
  const t = parseDate(today);
  if (!t) return [];
  const first = t.y * 12 + (t.m - 1);
  return Array.from({ length: 12 }, (_, i) => indexToMonth(first + i));
}
