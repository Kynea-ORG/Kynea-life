// lib/classes/detailInfo.ts
//
// Textos y reglas de la parte alta del detalle de clase en mobile (recuadro "Cuándo", recuadro del mapa,
// chips, lista "Antes de ir" y "Leer más"). Módulo puro, sin dependencias de React.
import { formatFriendlyDate, formatTimeSlots } from '@/lib/utils';
import type { DanceClass } from '@/lib/types';

type Slot = { days: string[]; startTime: string; endTime: string };
const hhmm = (t: string) => t.slice(0, 5);

export interface WhenTile {
  label: string;
  big: string;
  sub: string;
  /** Todos los horarios, solo cuando hay más de uno (para desplegarlos al tocar el recuadro). */
  extraSlots: string[];
  muted: boolean;
}

/**
 * Recuadro "Cuándo": fecha de inicio grande y horario debajo. Reemplaza al puntaje del Vrbo,
 * porque Kynea no tiene reseñas de clases. Devuelve null si no hay ni fecha ni horario.
 */
export function detailWhenTile(
  cls: Pick<DanceClass, 'startDate' | 'timeSlots'> & { endDate?: string },
  isExpired: boolean,
): WhenTile | null {
  const slots: Slot[] = cls.timeSlots ?? [];
  const first = slots[0];
  const firstText = first ? formatTimeSlots([first]) : '';
  const sub = slots.length > 1 ? `${firstText} +${slots.length - 1} más` : firstText;
  const extraSlots = slots.length > 1 ? slots.map(s => formatTimeSlots([s])) : [];

  if (isExpired) {
    if (cls.endDate) return { label: 'FINALIZÓ', big: formatFriendlyDate(cls.endDate), sub, extraSlots, muted: true };
    if (cls.startDate) return { label: 'INICIÓ', big: formatFriendlyDate(cls.startDate), sub, extraSlots, muted: true };
    return { label: 'ESTADO', big: 'Finalizada', sub, extraSlots, muted: true };
  }

  if (cls.startDate) return { label: 'INICIA', big: formatFriendlyDate(cls.startDate), sub, extraSlots, muted: false };
  if (!first) return null;
  return {
    label: 'HORARIO',
    big: `${hhmm(first.startTime)} – ${hhmm(first.endTime)}`,
    sub: slots.length > 1 ? `${first.days.join(', ')} +${slots.length - 1} más` : first.days.join(', '),
    extraSlots,
    muted: false,
  };
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
}

/** Chips bajo el título: nivel y modalidad (y "1.ª clase gratis" si aplica). */
export function detailChips(cls: Pick<DanceClass, 'level' | 'modality' | 'isTrialFree'>): DetailChip[] {
  const chips: DetailChip[] = [];
  if (cls.level) chips.push({ label: `Nivel ${cls.level}`, tone: 'neutral' });
  if (cls.modality) chips.push({ label: cls.modality, tone: 'neutral' });
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
