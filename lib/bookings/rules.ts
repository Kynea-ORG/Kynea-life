import type { BookingMode, BookingStatus, CancellationPolicy } from './types';

export type Bookability =
  | { bookable: true }
  | { bookable: false; reason: 'disabled' | 'external' | 'unpublished' | 'sold_out' };

interface BookableClass {
  bookingMode?: BookingMode;
  status: string;
  externalOrganizer?: unknown;
  availableSpots?: number;
}

/**
 * ¿Se muestra el botón "Reservar" para esta clase? La decisión final la toma siempre la base de
 * datos (reserve_booking); esto solo decide qué mostrar. Una clase de organizador externo nunca
 * es reservable (no tiene profesor ni cuenta que reciba la reserva).
 */
export function getBookability(cls: BookableClass): Bookability {
  if (!cls.bookingMode || cls.bookingMode === 'none') return { bookable: false, reason: 'disabled' };
  if (cls.externalOrganizer) return { bookable: false, reason: 'external' };
  if (cls.status !== 'published') return { bookable: false, reason: 'unpublished' };
  // En modo "por fecha" los cupos son de cada fecha, no de la clase.
  if (cls.bookingMode === 'class' && cls.availableSpots === 0) return { bookable: false, reason: 'sold_out' };
  return { bookable: true };
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  hold: 'Cupo guardado',
  pending_payment: 'Pendiente de pago',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  expired: 'Vencida',
  attended: 'Asistió',
  no_show: 'No asistió',
};

export function bookingStatusLabel(status: BookingStatus): string {
  return STATUS_LABELS[status] ?? status;
}

/** Estados que ocupan cupo y se pueden cancelar. */
export function isActiveBookingStatus(status: BookingStatus): boolean {
  return status === 'hold' || status === 'pending_payment' || status === 'confirmed';
}

const POLICY_TEXT: Record<CancellationPolicy, string> = {
  flexible: 'Flexible: cancela hasta 24 horas antes de la clase.',
  moderada: 'Moderada: cancela hasta 48 horas antes de la clase.',
  estricta: 'Estricta: cancela hasta 7 días antes de la clase.',
};

export function cancellationPolicyText(policy?: CancellationPolicy): string {
  return POLICY_TEXT[policy ?? 'moderada'];
}
