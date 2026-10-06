// lib/classes/detailInfo.ts
//
// Textos y reglas de la parte alta del detalle de clase en mobile (recuadro "Cuándo", recuadro del mapa,
// chips, lista "Antes de ir" y "Leer más"). Módulo puro, sin dependencias de React.
import { formatFriendlyDate, formatTimeSlots } from '@/lib/utils';
import type { DanceClass } from '@/lib/types';

type Slot = { days: string[]; startTime: string; endTime: string };
const hhmm = (t: string) => t.slice(0, 5);

const DAY_ABBR: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom',
};
const normalizeDay = (d: string) => d.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** "Domingo" · "Lun, Mié, Vie": un solo día va completo, varios se abrevian para que quepan en el recuadro. */
export function abbrevDays(days: string[]): string {
  if (days.length <= 1) return days.join('');
  return days.map(d => DAY_ABBR[normalizeDay(d)] ?? d).join(', ');
}

export interface WhenTile {
  /** Fecha de inicio (o de fin / de inicio si ya finalizó). null cuando la clase no tiene fecha. */
  date: { label: string; big: string } | null;
  /** Primer turno de horario y cuántos turnos más hay. null cuando no hay horarios. */
  schedule: { days: string; time: string; more: number } | null;
  /** Todos los turnos, solo cuando hay más de uno (para desplegarlos al tocar el recuadro). */
  extraSlots: string[];
  muted: boolean;
}

/**
 * Recuadro "Cuándo": dos bloques con su etiqueta, INICIA (fecha) y HORARIO (días y horas), para que se
 * entienda de un vistazo que hay horarios. Reemplaza al puntaje de Vrbo: Kynea no tiene reseñas de clases.
 * Devuelve null si no hay ni fecha ni horario.
 */
export function detailWhenTile(
  cls: Pick<DanceClass, 'startDate' | 'timeSlots'> & { endDate?: string },
  isExpired: boolean,
): WhenTile | null {
  const slots: Slot[] = cls.timeSlots ?? [];
  const first = slots[0];
  const schedule = first
    ? { days: abbrevDays(first.days), time: `${hhmm(first.startTime)} – ${hhmm(first.endTime)}`, more: slots.length - 1 }
    : null;
  const extraSlots = slots.length > 1 ? slots.map(s => formatTimeSlots([s])) : [];

  let date: WhenTile['date'] = null;
  if (isExpired) {
    if (cls.endDate) date = { label: 'FINALIZÓ', big: formatFriendlyDate(cls.endDate) };
    else if (cls.startDate) date = { label: 'INICIÓ', big: formatFriendlyDate(cls.startDate) };
    else date = { label: 'ESTADO', big: 'Finalizada' };
  } else if (cls.startDate) {
    date = { label: 'INICIA', big: formatFriendlyDate(cls.startDate) };
  }

  if (!date && !schedule) return null;
  return { date, schedule, extraSlots, muted: isExpired };
}

export interface WeekdayChip {
  initial: string;
  name: string;
  active: boolean;
}

const WEEK: { initial: string; name: string }[] = [
  { initial: 'L', name: 'Lunes' }, { initial: 'M', name: 'Martes' }, { initial: 'M', name: 'Miércoles' },
  { initial: 'J', name: 'Jueves' }, { initial: 'V', name: 'Viernes' }, { initial: 'S', name: 'Sábado' }, { initial: 'D', name: 'Domingo' },
];

/** Los 7 días de lunes a domingo, con los que tiene la clase marcados (sección "Horario" de desktop). */
export function weekdayInitials(slots: Slot[]): WeekdayChip[] {
  const used = new Set(slots.flatMap(s => s.days.map(normalizeDay)));
  return WEEK.map(d => ({ ...d, active: used.has(normalizeDay(d.name)) }));
}

/** "1 hora por sesión" · "1 h 30 min por sesión" · "45 min por sesión". Vacío si las horas no cuadran. */
export function sessionDuration(slot: Pick<Slot, 'startTime' | 'endTime'>): string {
  const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const diff = mins(slot.endTime) - mins(slot.startTime);
  if (!Number.isFinite(diff) || diff <= 0) return '';
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h === 0) return `${m} min por sesión`;
  if (m === 0) return `${h} ${h === 1 ? 'hora' : 'horas'} por sesión`;
  return `${h} h ${m} min por sesión`;
}

/** "Del Dom 6 Set al Dom 29 Nov" · "Inicia el Dom 6 Set" · "". */
export function scheduleRangeText(cls: Pick<DanceClass, 'startDate'> & { endDate?: string }): string {
  if (!cls.startDate) return '';
  if (cls.endDate) return `Del ${formatFriendlyDate(cls.startDate)} al ${formatFriendlyDate(cls.endDate)}`;
  return `Inicia el ${formatFriendlyDate(cls.startDate)}`;
}

/** Cómo se contacta al profesor, según los canales que activó. */
export function contactNote(mode: DanceClass['contactMode']): string {
  if (mode === 'both') return 'Por WhatsApp o Instagram';
  if (mode === 'instagram') return 'Por Instagram';
  return 'Por WhatsApp';
}

/** Recuadro del mapa: nombre del local arriba y la zona debajo, sin repetir. */
export function detailVenueTile(
  cls: Pick<DanceClass, 'district' | 'city'> & { venueName?: string },
): { title: string; sub: string } {
  const { venueName, district, city } = cls;
  if (venueName && venueName !== district) {
    return { title: venueName, sub: [district, city].filter(Boolean).join(', ') };
  }
  return { title: district || city || '', sub: district ? city || '' : '' };
}

export interface DetailChip {
  label: string;
  tone: 'neutral' | 'green';
  /** Solo se muestra en mobile: en desktop esa información ya está en la tarjeta de reserva. */
  mobileOnly?: boolean;
}

/**
 * Chips bajo el título: nivel y modalidad, los cupos (solo informativos: sin barra de progreso ni urgencia,
 * y solo si el profesor eligió mostrarlos) y "1.ª clase gratis" si aplica.
 */
export function detailChips(
  cls: Pick<DanceClass, 'level' | 'modality' | 'isTrialFree' | 'availableSpots'>,
  opts: { showSpots?: boolean; isExpired?: boolean } = {},
): DetailChip[] {
  const chips: DetailChip[] = [];
  if (cls.level) chips.push({ label: `Nivel ${cls.level}`, tone: 'neutral' });
  if (cls.modality) chips.push({ label: cls.modality, tone: 'neutral' });
  const spots = cls.availableSpots;
  if (opts.showSpots && !opts.isExpired && spots !== undefined && spots > 0) {
    chips.push({ label: `${spots} ${spots === 1 ? 'cupo disponible' : 'cupos disponibles'}`, tone: 'neutral', mobileOnly: true });
  }
  if (cls.isTrialFree) chips.push({ label: '1.ª clase gratis', tone: 'green' });
  return chips;
}

export interface PrepLine {
  key: 'learn' | 'forWhom' | 'requirements' | 'bring';
  label: string;
  text: string;
}

/** Bloque "Antes de ir": una línea por categoría, solo si el profesor llenó ese campo. */
export function buildPrepLines(
  cls: Partial<Pick<DanceClass, 'whatYouLearn' | 'forWhom' | 'requirements' | 'footwear' | 'clothing' | 'toBring'>>,
): PrepLine[] {
  const lines: PrepLine[] = [];
  if (cls.whatYouLearn?.length) lines.push({ key: 'learn', label: 'Qué aprenderás', text: cls.whatYouLearn.join(', ') });
  if (cls.forWhom) lines.push({ key: 'forWhom', label: 'Para quién', text: cls.forWhom });
  if (cls.requirements?.length) lines.push({ key: 'requirements', label: 'Requisitos', text: cls.requirements.join(', ') });
  const bring = [
    cls.footwear?.length ? `Calzado: ${cls.footwear.join(', ')}` : '',
    cls.clothing ? `Ropa: ${cls.clothing}` : '',
    cls.toBring?.length ? cls.toBring.join(', ') : '',
  ].filter(Boolean);
  if (bring.length) lines.push({ key: 'bring', label: 'Qué traer', text: bring.join(' · ') });
  return lines;
}

/**
 * ¿El texto tiene más de `maxLines` líneas en una columna de mobile? Estimación conservadora (pocos
 * caracteres por línea): en el peor caso muestra un "Leer más" que no esconde nada, nunca al revés.
 */
export function needsReadMore(text: string | undefined, maxLines = 4, charsPerLine = 34): boolean {
  if (!text) return false;
  const lines = text.split('\n').reduce((sum, l) => sum + Math.max(1, Math.ceil(l.length / charsPerLine)), 0);
  return lines > maxLines;
}
