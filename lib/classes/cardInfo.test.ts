import { describe, it, expect } from 'vitest';
import { cardWhenLabel, cardPlaceLabel } from './cardInfo';
import { formatFriendlyDate } from '@/lib/utils';

const slot = (startTime = '20:30:00', endTime = '22:00:00') => ({ days: ['Lunes'], startTime, endTime });

describe('cardWhenLabel', () => {
  it('muestra cuándo inicia y el horario (HH:MM, sin segundos)', () => {
    expect(cardWhenLabel({ startDate: '2026-09-14', timeSlots: [slot()] }, false))
      .toBe(`Inicia ${formatFriendlyDate('2026-09-14')} · 20:30–22:00`);
  });

  it('con varios horarios muestra el primero y cuántos más hay', () => {
    expect(cardWhenLabel({ startDate: '2026-09-14', timeSlots: [slot(), slot('18:00', '19:00'), slot('10:00', '11:00')] }, false))
      .toBe(`Inicia ${formatFriendlyDate('2026-09-14')} · 20:30–22:00 +2`);
  });

  it('sin horarios muestra solo cuándo inicia', () => {
    expect(cardWhenLabel({ startDate: '2026-09-14', timeSlots: [] }, false))
      .toBe(`Inicia ${formatFriendlyDate('2026-09-14')}`);
  });

  it('sin fecha de inicio muestra solo el horario', () => {
    expect(cardWhenLabel({ startDate: '', timeSlots: [slot()] }, false)).toBe('20:30–22:00');
  });

  it('sin fecha ni horario no muestra nada', () => {
    expect(cardWhenLabel({ startDate: '', timeSlots: [] }, false)).toBe('');
  });

  it('una clase finalizada dice cuándo terminó, o cuándo inició si no hay fin', () => {
    expect(cardWhenLabel({ startDate: '2026-08-01', endDate: '2026-08-30', timeSlots: [slot()] }, true))
      .toBe(`Finalizó el ${formatFriendlyDate('2026-08-30')}`);
    expect(cardWhenLabel({ startDate: '2026-08-01', timeSlots: [slot()] }, true))
      .toBe(`Inició el ${formatFriendlyDate('2026-08-01')}`);
    expect(cardWhenLabel({ startDate: '', timeSlots: [] }, true)).toBe('Clase finalizada');
  });
});

describe('cardPlaceLabel', () => {
  it('local y distrito', () => {
    expect(cardPlaceLabel({ modality: 'Presencial', venueName: 'Freesoul Studio', district: 'Miraflores', city: 'Lima' }))
      .toBe('Freesoul Studio · Miraflores');
  });

  it('sin nombre de local: distrito y ciudad', () => {
    expect(cardPlaceLabel({ modality: 'Presencial', district: 'Miraflores', city: 'Lima' })).toBe('Miraflores, Lima');
  });

  it('solo ciudad', () => {
    expect(cardPlaceLabel({ modality: 'Presencial', district: '', city: 'Lima' })).toBe('Lima');
  });

  it('clases online', () => {
    expect(cardPlaceLabel({ modality: 'Online', district: '', city: '' })).toBe('Online');
  });

  it('sin ningún dato de lugar devuelve vacío', () => {
    expect(cardPlaceLabel({ modality: 'Presencial', district: '', city: '' })).toBe('');
  });
});
