// lib/classes/cardInfo.ts
//
// Textos cortos para las tarjetas compactas de clase (mobile): cuándo inicia y a qué hora y dónde es. Módulo puro, sin dependencias de React.
import { formatFriendlyDate } from '@/lib/utils';
import type { DanceClass } from '@/lib/types';

const hhmm = (t: string) => t.slice(0, 5);

/** "Inicia Lun 14 Set · 20:30–22:00" (+N si hay más horarios). Finalizadas: cuándo terminaron. */
export function cardWhenLabel(
  cls: Pick<DanceClass, 'startDate' | 'timeSlots'> & { endDate?: string },
  isExpired: boolean,
): string {
  if (isExpired) {
    if (cls.endDate) return `Finalizó el ${formatFriendlyDate(cls.endDate)}`;
    if (cls.startDate) return `Inició el ${formatFriendlyDate(cls.startDate)}`;
    return 'Clase finalizada';
  }

  const slots = cls.timeSlots ?? [];
  const first = slots[0];
  const time = first
    ? `${hhmm(first.startTime)}–${hhmm(first.endTime)}${slots.length > 1 ? ` +${slots.length - 1}` : ''}`
    : '';
  const start = cls.startDate ? `Inicia ${formatFriendlyDate(cls.startDate)}` : '';
  return [start, time].filter(Boolean).join(' · ');
}

/** "Freesoul Studio · Miraflores" · "Miraflores, Lima" · "Online". */
export function cardPlaceLabel(
  cls: Pick<DanceClass, 'modality' | 'district' | 'city'> & { venueName?: string },
): string {
  if (cls.modality === 'Online') return 'Online';
  if (cls.venueName && cls.district) return `${cls.venueName} · ${cls.district}`;
  if (cls.venueName) return cls.venueName;
  if (cls.district && cls.city) return `${cls.district}, ${cls.city}`;
  return cls.district || cls.city || '';
}
