// Las RPC de reservas (migración 70) lanzan un código como mensaje de la excepción
// (RAISE EXCEPTION 'SOLD_OUT'). Aquí se traduce a un texto para el usuario, sin filtrar
// nunca el mensaje técnico de la base de datos.

export type BookingErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'INVALID_SEATS'
  | 'INVALID_SESSIONS'
  | 'CLASS_NOT_BOOKABLE'
  | 'OWN_CLASS'
  | 'PAST_DATE'
  | 'FUTURE_DATE'
  | 'SESSION_NOT_FOUND'
  | 'ALREADY_BOOKED'
  | 'SOLD_OUT'
  | 'BOOKING_NOT_FOUND'
  | 'NOT_ALLOWED'
  | 'NOT_CANCELLABLE'
  | 'NOT_CONFIRMABLE'
  | 'CANCEL_WINDOW_CLOSED'
  | 'CONTACT_REQUIRED'
  | 'INVALID_STATUS'
  | 'CLASS_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'UNKNOWN';

export const BOOKING_ERROR_MESSAGES: Record<BookingErrorCode, string> = {
  NOT_AUTHENTICATED: 'Inicia sesión para reservar.',
  INVALID_SEATS: 'La cantidad de cupos no es válida.',
  INVALID_SESSIONS: 'La selección de fechas no es válida (máximo 20 fechas por reserva).',
  CLASS_NOT_BOOKABLE: 'Esta clase no acepta reservas en este momento.',
  OWN_CLASS: 'No puedes reservar tu propia clase.',
  PAST_DATE: 'Esta fecha ya pasó.',
  FUTURE_DATE: 'Todavía no puedes marcar ausencia en una clase que aún no termina.',
  SESSION_NOT_FOUND: 'Esa fecha ya no está disponible.',
  ALREADY_BOOKED: 'Ya tienes una reserva registrada para esta fecha o clase.',
  SOLD_OUT: 'Ya no quedan cupos suficientes.',
  BOOKING_NOT_FOUND: 'No encontramos esa reserva.',
  NOT_ALLOWED: 'No tienes permiso para hacer esto.',
  NOT_CANCELLABLE: 'Esta reserva ya no se puede cambiar.',
  NOT_CONFIRMABLE: 'Esta reserva ya no está pendiente de confirmación.',
  CANCEL_WINDOW_CLOSED: 'Ya pasó el plazo para cancelar según la política de la clase. Escríbele al profesor si necesitas cambiarla.',
  CONTACT_REQUIRED: 'Ingresa tu WhatsApp o tu usuario de Instagram para que el profesor pueda coordinar contigo.',
  INVALID_STATUS: 'El estado indicado no es válido.',
  CLASS_NOT_FOUND: 'No encontramos esa clase.',
  RATE_LIMITED: 'Hiciste demasiados intentos. Espera un minuto e inténtalo de nuevo.',
  UNKNOWN: 'No pudimos completar la operación. Inténtalo de nuevo.',
};

const KNOWN_CODES = (Object.keys(BOOKING_ERROR_MESSAGES) as BookingErrorCode[]).filter(c => c !== 'UNKNOWN');

export function parseBookingError(err: unknown): { code: BookingErrorCode; message: string } {
  const raw =
    typeof err === 'string' ? err
    : err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message)
    : '';
  const code = KNOWN_CODES.find(c => raw.includes(c)) ?? 'UNKNOWN';
  return { code, message: BOOKING_ERROR_MESSAGES[code] };
}
