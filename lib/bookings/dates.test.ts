import { describe, it, expect } from 'vitest';
import {
  addDays, daysUntil, countdownLabel, classTimingLabel, cancellationDeadline, canStillCancel,
  googleCalendarUrl, buildIcs, formatLongDate, pickInitialSchedule, hasStartPassedLima, formatDeadlineLima,
  BOOKING_AUTO_CLOSE_HOURS, autoCloseCountdown, limaToDate,
} from './dates';

describe('addDays', () => {
  it('suma días calendario cruzando mes y año', () => {
    expect(addDays('2026-11-13', 1)).toBe('2026-11-14');
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-11-13', 0)).toBe('2026-11-13');
  });
});

describe('daysUntil / countdownLabel', () => {
  it('cuenta días calendario entre dos fechas YYYY-MM-DD', () => {
    expect(daysUntil('2026-11-23', '2026-11-13')).toBe(10);
    expect(daysUntil('2026-11-13', '2026-11-13')).toBe(0);
    expect(daysUntil('2026-11-12', '2026-11-13')).toBe(-1);
    expect(daysUntil('2027-01-02', '2026-12-30')).toBe(3);
  });

  it('redacta la cuenta regresiva', () => {
    expect(countdownLabel(0)).toBe('Es hoy');
    expect(countdownLabel(1)).toBe('Es mañana');
    expect(countdownLabel(5)).toBe('Faltan 5 días');
    expect(countdownLabel(-2)).toBe('Finalizada');
  });
});

describe('classTimingLabel', () => {
  const T = '2026-11-13';
  it('antes del inicio cuenta los días', () => {
    expect(classTimingLabel('2026-11-18', '2026-12-18', T)).toBe('Faltan 5 días');
    expect(classTimingLabel('2026-11-13', undefined, T)).toBe('Es hoy');
  });
  it('si ya empezó pero no terminó, está en curso', () => {
    expect(classTimingLabel('2026-11-01', '2026-12-18', T)).toBe('En curso');
  });
  it('si ya terminó, está finalizada', () => {
    expect(classTimingLabel('2026-10-01', '2026-11-01', T)).toBe('Finalizada');
    expect(classTimingLabel('2026-11-10', undefined, T)).toBe('Finalizada');
  });
});

describe('cancellationDeadline / canStillCancel', () => {
  it('flexible = 24 h antes, moderada = 48 h, estricta = 7 días (hora de Lima)', () => {
    expect(cancellationDeadline('2026-11-23', '19:00', 'flexible').toISOString()).toBe('2026-11-23T00:00:00.000Z'); // 22/11 19:00 Lima
    expect(cancellationDeadline('2026-11-23', '19:00', 'moderada').toISOString()).toBe('2026-11-22T00:00:00.000Z');
    expect(cancellationDeadline('2026-11-23', '19:00', 'estricta').toISOString()).toBe('2026-11-17T00:00:00.000Z');
  });

  it('sin hora de inicio asume el inicio del día', () => {
    expect(cancellationDeadline('2026-11-23', undefined, 'flexible').toISOString()).toBe('2026-11-22T05:00:00.000Z');
  });

  it('compara con la hora actual', () => {
    const now = new Date('2026-11-22T12:00:00Z');
    expect(canStillCancel('2026-11-30', '19:00', 'flexible', now)).toBe(true);
    expect(canStillCancel('2026-11-22', '19:00', 'flexible', now)).toBe(false);
  });
});

describe('calendario', () => {
  const ev = {
    title: 'Taller de bachata', date: '2026-11-23', startTime: '19:00', endTime: '20:30',
    location: 'Estudio Sol, Av. 1', details: 'Trae zapatillas.',
  };

  it('arma el enlace de Google Calendar con zona horaria de Lima', () => {
    const url = new URL(googleCalendarUrl(ev));
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe('Taller de bachata');
    expect(url.searchParams.get('dates')).toBe('20261123T190000/20261123T203000');
    expect(url.searchParams.get('ctz')).toBe('America/Lima');
    expect(url.searchParams.get('location')).toBe('Estudio Sol, Av. 1');
  });

  it('genera un .ics válido en UTC', () => {
    const ics = buildIcs(ev, 'abc');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('UID:abc@kynea.dance');
    expect(ics).toContain('DTSTART:20261124T000000Z');
    expect(ics).toContain('DTEND:20261124T013000Z');
    expect(ics).toContain('SUMMARY:Taller de bachata');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('escapa comas, punto y coma y saltos de línea en el .ics', () => {
    const ics = buildIcs({ ...ev, location: 'Av. 1, piso 2; Lima', details: 'a\nb' }, 'x');
    expect(ics).toContain('LOCATION:Av. 1\\, piso 2\\; Lima');
    expect(ics).toContain('DESCRIPTION:a\\nb');
  });
});

describe('formatLongDate', () => {
  it('escribe la fecha en español', () => {
    expect(formatLongDate('2026-11-23')).toMatch(/lunes,? 23 de noviembre/i);
  });
});

describe('pickInitialSchedule / hasStartPassedLima / formatDeadlineLima', () => {
  it('elige el horario que coincide con el día de startDate y desempata por hora', () => {
    // 2026-11-25 es miércoles (day_of_week = 2)
    const slot = pickInitialSchedule([
      { day_of_week: 0, start_time: '19:00:00' },
      { day_of_week: 2, start_time: '18:00:00' },
      { day_of_week: 2, start_time: '10:00:00' },
    ], '2026-11-25');
    expect(slot).toEqual({ day_of_week: 2, start_time: '10:00:00' });
  });

  it('hasStartPassedLima corta exactamente en start_time hora Lima', () => {
    // 2026-11-23 19:00 Lima = 2026-11-24T00:00:00Z
    expect(hasStartPassedLima('2026-11-23', '19:00', new Date('2026-11-23T23:59:59Z'))).toBe(false);
    expect(hasStartPassedLima('2026-11-23', '19:00', new Date('2026-11-24T00:00:00Z'))).toBe(true);
    expect(hasStartPassedLima('2026-11-23', '19:00', new Date('2026-11-24T00:05:00Z'))).toBe(true);
  });

  it('formatDeadlineLima incluye día, mes y hora Lima', () => {
    const deadline = cancellationDeadline('2026-11-23', '19:00', 'flexible');
    expect(formatDeadlineLima(deadline)).toMatch(/22 de noviembre a las 19:00/i);
  });
});

describe('autoCloseCountdown', () => {
  it('usa 48 horas por defecto tras el fin de la clase en Lima', () => {
    expect(BOOKING_AUTO_CLOSE_HOURS).toBe(48);
    // Clase terminó el 2026-11-20 a las 20:00 Lima -> autocierre el 2026-11-22 a las 20:00 Lima
    const after6h = limaToDate('2026-11-21', '02:00');
    expect(autoCloseCountdown('2026-11-20', '20:00', '19:00', after6h)).toMatchObject({
      overdue: false,
      urgent: false,
      label: 'Se cierra en 1 d 18 h',
      shortLabel: '1 d 18 h',
    });

    const after34h = limaToDate('2026-11-22', '06:00');
    expect(autoCloseCountdown('2026-11-20', '20:00', '19:00', after34h)).toMatchObject({
      overdue: false,
      urgent: false,
      label: 'Se cierra en 14 h',
      shortLabel: '14 h',
    });

    const after45h = limaToDate('2026-11-22', '17:00');
    expect(autoCloseCountdown('2026-11-20', '20:00', '19:00', after45h)).toMatchObject({
      overdue: false,
      urgent: true,
      label: 'Se cierra en 3 h',
      shortLabel: '3 h',
    });

    const after47h15m = limaToDate('2026-11-22', '19:15');
    expect(autoCloseCountdown('2026-11-20', '20:00', '19:00', after47h15m)).toMatchObject({
      overdue: false,
      urgent: true,
      label: 'Se cierra en 45 min',
      shortLabel: '45 min',
    });

    const after48h = limaToDate('2026-11-22', '20:00');
    expect(autoCloseCountdown('2026-11-20', '20:00', '19:00', after48h)).toMatchObject({
      overdue: true,
      urgent: true,
      remainingMs: 0,
      label: 'Cierre automático pendiente',
      shortLabel: 'Cierre pronto',
    });
  });

  it('maneja cruce de medianoche y fallback sin endTime', () => {
    // Cruce de medianoche: empezó 23:00 del 20 y terminó 01:00 del 21 -> autocierre 01:00 del 23
    const now = limaToDate('2026-11-22', '11:00');
    expect(autoCloseCountdown('2026-11-20', '01:00', '23:00', now)).toMatchObject({
      label: 'Se cierra en 14 h',
      shortLabel: '14 h',
    });

    // Sin endTime: usa startTime + 1h (terminó 19:00 del 20 -> autocierre 19:00 del 22)
    expect(autoCloseCountdown('2026-11-20', undefined, '18:00', limaToDate('2026-11-22', '18:30'))).toMatchObject({
      label: 'Se cierra en 30 min',
      shortLabel: '30 min',
      urgent: true,
    });
  });
});
