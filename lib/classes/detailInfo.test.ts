import { describe, expect, it } from 'vitest';
import { abbrevDays, detailWhenTile, detailVenueTile, detailChips, buildPrepLines, needsReadMore, weekdayInitials, sessionDuration, scheduleRangeText, contactNote } from './detailInfo';
import { formatFriendlyDate } from '@/lib/utils';

const slot = (days: string[], start = '11:00:00', end = '12:00:00') => ({ days, startTime: start, endTime: end });

describe('abbrevDays', () => {
  it('un solo día va completo', () => {
    expect(abbrevDays(['Domingo'])).toBe('Domingo');
  });
  it('varios días se abrevian a 3 letras', () => {
    expect(abbrevDays(['Lunes', 'Miércoles', 'Viernes'])).toBe('Lun, Mié, Vie');
    expect(abbrevDays(['Sábado', 'Domingo'])).toBe('Sáb, Dom');
  });
  it('un nombre desconocido se deja tal cual', () => {
    expect(abbrevDays(['Feriados', 'Lunes'])).toBe('Feriados, Lun');
  });
});

describe('detailWhenTile', () => {
  it('separa la fecha de inicio del horario (dos bloques con su etiqueta)', () => {
    const t = detailWhenTile({ startDate: '2099-09-06', timeSlots: [slot(['Domingo'])] }, false);
    expect(t).toEqual({
      date: { label: 'INICIA', big: formatFriendlyDate('2099-09-06') },
      schedule: { days: 'Domingo', time: '11:00 – 12:00', more: 0 },
      extraSlots: [],
      muted: false,
    });
  });

  it('varios días en un turno se abrevian', () => {
    const t = detailWhenTile({ startDate: '2099-09-06', timeSlots: [slot(['Lunes', 'Miércoles', 'Viernes'], '19:00:00', '20:30:00')] }, false)!;
    expect(t.schedule).toEqual({ days: 'Lun, Mié, Vie', time: '19:00 – 20:30', more: 0 });
  });

  it('varios turnos: muestra el primero, cuenta los demás y deja la lista completa en extraSlots', () => {
    const t = detailWhenTile({ startDate: '2099-09-06', timeSlots: [slot(['Lunes']), slot(['Miércoles'], '19:00:00', '20:30:00')] }, false)!;
    expect(t.schedule).toEqual({ days: 'Lunes', time: '11:00 – 12:00', more: 1 });
    expect(t.extraSlots).toEqual(['Lunes · 11:00 – 12:00', 'Miércoles · 19:00 – 20:30']);
  });

  it('sin fecha de inicio solo hay horario', () => {
    const t = detailWhenTile({ startDate: '', timeSlots: [slot(['Sábado'], '10:00:00', '11:30:00')] }, false)!;
    expect(t.date).toBeNull();
    expect(t.schedule).toEqual({ days: 'Sábado', time: '10:00 – 11:30', more: 0 });
  });

  it('sin fecha de inicio pero con fecha: sin horario solo hay fecha', () => {
    const t = detailWhenTile({ startDate: '2099-09-06', timeSlots: [] }, false)!;
    expect(t.schedule).toBeNull();
    expect(t.date).toEqual({ label: 'INICIA', big: formatFriendlyDate('2099-09-06') });
  });

  it('sin fecha ni horario no hay recuadro', () => {
    expect(detailWhenTile({ startDate: '', timeSlots: [] }, false)).toBeNull();
  });

  it('finalizada: usa la fecha de fin ("FINALIZÓ"), o la de inicio ("INICIÓ"), en gris', () => {
    const base = { startDate: '2020-01-10', timeSlots: [slot(['Lunes'])] };
    const ended = detailWhenTile({ ...base, endDate: '2020-02-10' }, true)!;
    expect(ended).toMatchObject({ date: { label: 'FINALIZÓ', big: formatFriendlyDate('2020-02-10') }, muted: true });
    const started = detailWhenTile(base, true)!;
    expect(started).toMatchObject({ date: { label: 'INICIÓ', big: formatFriendlyDate('2020-01-10') }, muted: true });
    expect(detailWhenTile({ startDate: '', timeSlots: [] }, true)).toMatchObject({ date: { label: 'ESTADO', big: 'Finalizada' }, muted: true });
  });
});

describe('weekdayInitials', () => {
  it('devuelve los 7 días de lunes a domingo y marca los que tiene la clase', () => {
    const days = weekdayInitials([slot(['Domingo']), slot(['Miércoles', 'Viernes'])]);
    expect(days.map(d => d.initial)).toEqual(['L', 'M', 'M', 'J', 'V', 'S', 'D']);
    expect(days.filter(d => d.active).map(d => d.name)).toEqual(['Miércoles', 'Viernes', 'Domingo']);
  });
  it('ignora mayúsculas y tildes', () => {
    expect(weekdayInitials([slot(['miercoles'])]).filter(d => d.active).map(d => d.name)).toEqual(['Miércoles']);
  });
  it('sin horarios ninguno está activo', () => {
    expect(weekdayInitials([]).some(d => d.active)).toBe(false);
  });
});

describe('sessionDuration', () => {
  it.each([
    ['11:00:00', '12:00:00', '1 hora por sesión'],
    ['11:00:00', '13:00:00', '2 horas por sesión'],
    ['19:00:00', '20:30:00', '1 h 30 min por sesión'],
    ['19:00:00', '19:45:00', '45 min por sesión'],
    ['20:00:00', '19:00:00', ''],
  ])('%s – %s → "%s"', (a, b, expected) => {
    expect(sessionDuration(slot(['Lunes'], a, b))).toBe(expected);
  });
});

describe('scheduleRangeText', () => {
  it('con fecha de fin: "Del … al …"', () => {
    expect(scheduleRangeText({ startDate: '2099-09-06', endDate: '2099-11-29' })).toBe(`Del ${formatFriendlyDate('2099-09-06')} al ${formatFriendlyDate('2099-11-29')}`);
  });
  it('sin fecha de fin: "Inicia el …"', () => {
    expect(scheduleRangeText({ startDate: '2099-09-06' })).toBe(`Inicia el ${formatFriendlyDate('2099-09-06')}`);
  });
  it('sin fechas no hay texto', () => {
    expect(scheduleRangeText({ startDate: '' })).toBe('');
  });
});

describe('contactNote', () => {
  it('según el canal de contacto', () => {
    expect(contactNote('whatsapp')).toBe('Por WhatsApp');
    expect(contactNote('instagram')).toBe('Por Instagram');
    expect(contactNote('both')).toBe('Por WhatsApp o Instagram');
    expect(contactNote(undefined)).toBe('Por WhatsApp');
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
  const base = { level: 'Básico', modality: 'Presencial' as const, isTrialFree: false, availableSpots: undefined as number | undefined };
  it('nivel y modalidad', () => {
    expect(detailChips(base)).toEqual([
      { label: 'Nivel Básico', tone: 'neutral' },
      { label: 'Presencial', tone: 'neutral' },
    ]);
  });
  it('suma "1.ª clase gratis" en verde cuando aplica', () => {
    const chips = detailChips({ ...base, modality: 'Online' as const, isTrialFree: true });
    expect(chips[chips.length - 1]).toEqual({ label: '1.ª clase gratis', tone: 'green' });
  });
  it('omite lo que no existe', () => {
    expect(detailChips({ level: undefined, modality: undefined, isTrialFree: undefined, availableSpots: undefined } as never)).toEqual([]);
  });
  it('cupos: solo informativos, neutros y solo si el profesor los muestra', () => {
    const withSpots = detailChips({ ...base, availableSpots: 7 }, { showSpots: true });
    expect(withSpots).toContainEqual({ label: '7 cupos disponibles', tone: 'neutral', mobileOnly: true });
    expect(detailChips({ ...base, availableSpots: 1 }, { showSpots: true })).toContainEqual({ label: '1 cupo disponible', tone: 'neutral', mobileOnly: true });
    expect(detailChips({ ...base, availableSpots: 7 }, { showSpots: false }).some(c => /cupo/.test(c.label))).toBe(false);
    expect(detailChips({ ...base, availableSpots: 0 }, { showSpots: true }).some(c => /cupo/.test(c.label))).toBe(false);
    expect(detailChips({ ...base, availableSpots: 7 }, { showSpots: true, isExpired: true }).some(c => /cupo/.test(c.label))).toBe(false);
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
