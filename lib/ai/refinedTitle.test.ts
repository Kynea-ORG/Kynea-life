// lib/ai/refinedTitle.test.ts
import { describe, it, expect } from 'vitest';
import { formatRefinedTitle } from './refinedTitle';

describe('formatRefinedTitle', () => {
  it('genera título con estilo y edad (flamenco para adultos tras quitar ciudad)', () => {
    expect(formatRefinedTitle({ style: 'Flamenco', ageGroup: 'Adultos' })).toBe(
      'Clases de Flamenco para adultos'
    );
  });

  it('genera título solo con estilo tras quitar la edad', () => {
    expect(formatRefinedTitle({ style: 'Flamenco' })).toBe('Clases de Flamenco');
  });

  it('genera título con nivel y distrito', () => {
    expect(
      formatRefinedTitle({ style: 'Salsa', level: 'Principiante', district: 'Miraflores' })
    ).toBe('Clases de Salsa para principiantes en Miraflores');
  });

  it('genera título con modalidad online', () => {
    expect(formatRefinedTitle({ style: 'Bachata', modality: 'Online' })).toBe(
      'Clases de Bachata online'
    );
  });

  it('genera título para público infantil sin estilo específico', () => {
    expect(formatRefinedTitle({ ageGroup: 'Niños' })).toBe('Clases de baile para niños');
  });

  it('genera título con horario y fines de semana', () => {
    expect(
      formatRefinedTitle({ style: 'K-Pop', timeOfDay: 'morning', daysOfWeek: [5, 6] })
    ).toBe('Clases de K-Pop en las mañanas los fines de semana');
  });

  it('genera fallback cuando no hay filtros', () => {
    expect(formatRefinedTitle({})).toBe('Clases de baile');
    expect(formatRefinedTitle(null)).toBe('Todas las clases');
  });

  it('ignora strings de edad erróneamente asignados en level', () => {
    expect(
      formatRefinedTitle({ style: 'Flamenco', level: 'Adultos', ageGroup: 'Adultos' })
    ).toBe('Clases de Flamenco para adultos');
  });

  it('genera título con horario de tarde (en la tarde) cuando timeOfDay es afternoon', () => {
    expect(
      formatRefinedTitle({ style: 'Flamenco', ageGroup: 'Adultos', timeOfDay: 'afternoon' })
    ).toBe('Clases de Flamenco para adultos en la tarde');

    expect(
      formatRefinedTitle({ style: 'Flamenco', timeOfDay: 'afternoon' })
    ).toBe('Clases de Flamenco en la tarde');
  });

  it('detecta horario desde tags si no vino en filters', () => {
    expect(
      formatRefinedTitle({ style: 'Flamenco', ageGroup: 'Adultos' }, ['Tarde'])
    ).toBe('Clases de Flamenco para adultos en la tarde');
  });
});
