import { describe, expect, it } from 'vitest';
import { detailWhenTile, detailVenueTile, detailChips, buildPrepLines, needsReadMore } from './detailInfo';
import { formatFriendlyDate } from '@/lib/utils';

const slot = (days: string[], start = '11:00:00', end = '12:00:00') => ({ days, startTime: start, endTime: end });

describe('detailWhenTile', () => {
  it('muestra la fecha de inicio grande y el horario debajo', () => {
    const t = detailWhenTile({ startDate: '2099-09-06', timeSlots: [slot(['Domingo'])] }, false);
    expect(t).toEqual({
      label: 'INICIA',
      big: formatFriendlyDate('2099-09-06'),
      sub: 'Domingo · 11:00 – 12:00',
      extraSlots: [],
      muted: false,
    });
  });

  it('con varios horarios muestra el primero y "+N más", y deja el resto en extraSlots', () => {
    const t = detailWhenTile({ startDate: '2099-09-06', timeSlots: [slot(['Lunes']), slot(['Miércoles'], '19:00:00', '20:30:00')] }, false)!;
    expect(t.sub).toBe('Lunes · 11:00 – 12:00 +1 más');
    expect(t.extraSlots).toEqual(['Lunes · 11:00 – 12:00', 'Miércoles · 19:00 – 20:30']);
  });

  it('sin fecha de inicio muestra solo el horario', () => {
    const t = detailWhenTile({ startDate: '', timeSlots: [slot(['Sábado'], '10:00:00', '11:30:00')] }, false)!;
    expect(t.label).toBe('HORARIO');
    expect(t.big).toBe('10:00 – 11:30');
    expect(t.sub).toBe('Sábado');
  });

  it('sin fecha ni horario no hay recuadro', () => {
    expect(detailWhenTile({ startDate: '', timeSlots: [] }, false)).toBeNull();
  });

  it('finalizada: usa la fecha de fin ("FINALIZÓ"), o la de inicio ("INICIÓ"), en gris', () => {
    const base = { startDate: '2020-01-10', timeSlots: [slot(['Lunes'])] };
    const ended = detailWhenTile({ ...base, endDate: '2020-02-10' }, true)!;
    expect(ended).toMatchObject({ label: 'FINALIZÓ', big: formatFriendlyDate('2020-02-10'), muted: true });
    const started = detailWhenTile(base, true)!;
    expect(started).toMatchObject({ label: 'INICIÓ', big: formatFriendlyDate('2020-01-10'), muted: true });
    expect(detailWhenTile({ startDate: '', timeSlots: [] }, true)).toMatchObject({ label: 'ESTADO', big: 'Finalizada', muted: true });
  });
});

describe('detailVenueTile', () => {
  it('el nombre del local arriba y la zona debajo', () => {
    expect(detailVenueTile({ venueName: 'Garage Studio', district: 'Miraflores', city: 'Lima' })).toEqual({ title: 'Garage Studio', sub: 'Miraflores, Lima' });
  });
  it('sin nombre de local usa el distrito', () => {
    expect(detailVenueTile({ district: 'Miraflores', city: 'Lima' })).toEqual({ title: 'Miraflores', sub: 'Lima' });
  });
  it('si el nombre del local coincide con el distrito no repite la zona', () => {
    expect(detailVenueTile({ venueName: 'Miraflores', district: 'Miraflores', city: 'Lima' })).toEqual({ title: 'Miraflores', sub: 'Lima' });
  });
});

describe('detailChips', () => {
  it('nivel y modalidad', () => {
    expect(detailChips({ level: 'Básico', modality: 'Presencial', isTrialFree: false })).toEqual([
      { label: 'Nivel Básico', tone: 'neutral' },
      { label: 'Presencial', tone: 'neutral' },
    ]);
  });
  it('suma "1.ª clase gratis" en verde cuando aplica', () => {
    const chips = detailChips({ level: 'Básico', modality: 'Online', isTrialFree: true });
    expect(chips[chips.length - 1]).toEqual({ label: '1.ª clase gratis', tone: 'green' });
  });
  it('omite lo que no existe', () => {
    expect(detailChips({ level: undefined, modality: undefined, isTrialFree: undefined } as never)).toEqual([]);
  });
});

describe('buildPrepLines', () => {
  it('una línea por categoría y solo si hay dato', () => {
    const lines = buildPrepLines({
      whatYouLearn: ['Técnica básica', 'Ritmos'], forWhom: 'Principiantes', requirements: ['Evaluación previa'],
      footwear: ['Zapatillas'], clothing: 'Ropa negra', toBring: ['Agua', 'Castañuelas'],
    });
    expect(lines.map(l => l.key)).toEqual(['learn', 'forWhom', 'requirements', 'bring']);
    expect(lines[0]).toMatchObject({ label: 'Qué aprenderás', text: 'Técnica básica, Ritmos' });
    expect(lines[3].text).toBe('Calzado: Zapatillas · Ropa: Ropa negra · Agua, Castañuelas');
  });
  it('sin ningún dato devuelve lista vacía', () => {
    expect(buildPrepLines({})).toEqual([]);
    expect(buildPrepLines({ whatYouLearn: [], requirements: [], footwear: [], toBring: [] })).toEqual([]);
  });
});

describe('needsReadMore', () => {
  it('un texto corto cabe en 4 líneas', () => {
    expect(needsReadMore('Clase de flamenco para principiantes.')).toBe(false);
  });
  it('un texto largo necesita "Leer más"', () => {
    expect(needsReadMore('a'.repeat(400))).toBe(true);
  });
  it('los saltos de línea cuentan como líneas aunque el texto sea corto', () => {
    expect(needsReadMore('uno\n\ndos\n\ntres\n\ncuatro\n\ncinco')).toBe(true);
  });
  it('vacío no necesita nada', () => {
    expect(needsReadMore('')).toBe(false);
    expect(needsReadMore(undefined)).toBe(false);
  });
});
