import { describe, it, expect } from 'vitest';
import { getBookability, bookingStatusLabel, isActiveBookingStatus, cancellationPolicyText } from './rules';

const base = { bookingMode: 'class' as const, status: 'published' as const, externalOrganizer: undefined, availableSpots: 5 as number | undefined };

describe('getBookability', () => {
  it('no se puede reservar si el modo es "none" o no está definido', () => {
    expect(getBookability({ ...base, bookingMode: 'none' })).toEqual({ bookable: false, reason: 'disabled' });
    expect(getBookability({ ...base, bookingMode: undefined })).toEqual({ bookable: false, reason: 'disabled' });
  });

  it('no se puede reservar una clase de organizador externo', () => {
    const r = getBookability({ ...base, externalOrganizer: { name: 'Min. Cultura', infoUrl: 'https://x.pe' } });
    expect(r).toEqual({ bookable: false, reason: 'external' });
  });

  it('no se puede reservar una clase que no está publicada', () => {
    expect(getBookability({ ...base, status: 'draft' })).toEqual({ bookable: false, reason: 'unpublished' });
  });

  it('clase completa sin cupos: no reservable por agotada', () => {
    expect(getBookability({ ...base, availableSpots: 0 })).toEqual({ bookable: false, reason: 'sold_out' });
  });

  it('clase completa con cupos o sin límite: reservable', () => {
    expect(getBookability(base)).toEqual({ bookable: true });
    expect(getBookability({ ...base, availableSpots: undefined })).toEqual({ bookable: true });
  });

  it('modo por fecha: reservable aunque availableSpots sea 0 (los cupos son por fecha)', () => {
    expect(getBookability({ ...base, bookingMode: 'session', availableSpots: 0 })).toEqual({ bookable: true });
  });
});

describe('bookingStatusLabel / isActiveBookingStatus', () => {
  it('etiqueta cada estado en español', () => {
    expect(bookingStatusLabel('confirmed')).toBe('Confirmada');
    expect(bookingStatusLabel('cancelled')).toBe('Cancelada');
    expect(bookingStatusLabel('attended')).toBe('Asistió');
    expect(bookingStatusLabel('no_show')).toBe('No asistió');
  });

  it('solo hold, pendiente de pago y confirmada cuentan como activas', () => {
    expect(isActiveBookingStatus('confirmed')).toBe(true);
    expect(isActiveBookingStatus('hold')).toBe(true);
    expect(isActiveBookingStatus('cancelled')).toBe(false);
    expect(isActiveBookingStatus('attended')).toBe(false);
  });
});

describe('cancellationPolicyText', () => {
  it('describe cada política', () => {
    expect(cancellationPolicyText('flexible')).toContain('24');
    expect(cancellationPolicyText('moderada')).toContain('48');
    expect(cancellationPolicyText('estricta')).toContain('7');
  });
  it('usa moderada por defecto', () => {
    expect(cancellationPolicyText(undefined)).toBe(cancellationPolicyText('moderada'));
  });
});
