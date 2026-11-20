import { describe, it, expect } from 'vitest';
import { parseBookingError, BOOKING_ERROR_MESSAGES } from './errors';

describe('parseBookingError', () => {
  it('reconoce el código que lanza la RPC en el mensaje', () => {
    expect(parseBookingError({ message: 'SOLD_OUT' }).code).toBe('SOLD_OUT');
    expect(parseBookingError(new Error('ALREADY_BOOKED')).code).toBe('ALREADY_BOOKED');
  });

  it('reconoce el código aunque venga dentro de un texto más largo', () => {
    expect(parseBookingError({ message: 'P0001: OWN_CLASS (contexto)' }).code).toBe('OWN_CLASS');
  });

  it('devuelve un mensaje en español para cada código', () => {
    for (const [code, message] of Object.entries(BOOKING_ERROR_MESSAGES)) {
      expect(message.length, code).toBeGreaterThan(5);
    }
    expect(parseBookingError({ message: 'SOLD_OUT' }).message).toBe(BOOKING_ERROR_MESSAGES.SOLD_OUT);
  });

  it('cae en UNKNOWN sin filtrar el texto técnico de la base de datos', () => {
    const r = parseBookingError({ message: 'relation "bookings" does not exist' });
    expect(r.code).toBe('UNKNOWN');
    expect(r.message).not.toContain('relation');
  });

  it('acepta valores que no son errores', () => {
    expect(parseBookingError(null).code).toBe('UNKNOWN');
    expect(parseBookingError('SOLD_OUT').code).toBe('SOLD_OUT');
  });

  it('traduce el plazo de cancelación vencido', () => {
    expect(parseBookingError({ message: 'CANCEL_WINDOW_CLOSED' }).code).toBe('CANCEL_WINDOW_CLOSED');
  });
});
