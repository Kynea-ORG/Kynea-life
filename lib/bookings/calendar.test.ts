import { describe, it, expect } from 'vitest';
import { buildMonthGrid, bookingOccurrences, eventsByDate, monthTitle, assignClassColors, nextEntry, monthLegend } from './calendar';
import type { MyBooking } from './types';

function booking(over: Partial<MyBooking> = {}, cls: Partial<MyBooking['class']> = {}): MyBooking {
  return {
    id: 'b1', status: 'confirmed', seats: 1, priceAmount: 0, currency: 'PEN', paymentMethod: 'free', createdAt: '2026-11-01T00:00:00Z',
    class: { id: 'c1', title: 'Taller', type: 'taller', modality: 'Presencial', cancellationPolicy: 'flexible', footwear: [], toBring: [], requirements: [], days: [], ...cls },
    ...over,
  };
}

describe('buildMonthGrid', () => {
  it('noviembre 2026 empieza en domingo: la primera semana (lunes a domingo) arranca el 26 de octubre', () => {
    const grid = buildMonthGrid(2026, 10);
    expect(grid[0][0]).toEqual({ date: '2026-10-26', inMonth: false });
    expect(grid[0][6]).toEqual({ date: '2026-11-01', inMonth: true });
    expect(grid.every(w => w.length === 7)).toBe(true);
    expect(grid.flat().filter(c => c.inMonth)).toHaveLength(30);
  });

  it('completa la última semana con días del mes siguiente', () => {
    const grid = buildMonthGrid(2026, 10);
    const last = grid[grid.length - 1];
    expect(last[6].date).toBe('2026-12-06');
  });
});

describe('monthTitle', () => {
  it('escribe el mes y el año en español', () => {
    expect(monthTitle(2026, 10)).toMatch(/noviembre de 2026|noviembre 2026/i);
  });
});

describe('bookingOccurrences', () => {
  it('una reserva por fecha ocurre solo en su sesión', () => {
    const b = booking({ session: { id: 's1', date: '2026-11-23', startTime: '19:00', endTime: '20:00' } });
    expect(bookingOccurrences(b)).toEqual([{ date: '2026-11-23', startTime: '19:00', endTime: '20:00' }]);
  });

  it('una clase completa de un día ocurre en su fecha de inicio', () => {
    const b = booking({}, { startDate: '2026-11-22', startTime: '10:00', endTime: '12:00' });
    expect(bookingOccurrences(b)).toEqual([{ date: '2026-11-22', startTime: '10:00', endTime: '12:00' }]);
  });

  it('un curso semanal ocurre cada día de clase entre el inicio y el fin', () => {
    // lunes (0) y miércoles (2), del 2 al 18 de noviembre de 2026
    const b = booking({}, { startDate: '2026-11-02', endDate: '2026-11-18', days: [0, 2], startTime: '19:00', endTime: '20:00' });
    expect(bookingOccurrences(b).map(o => o.date)).toEqual([
      '2026-11-02', '2026-11-04', '2026-11-09', '2026-11-11', '2026-11-16', '2026-11-18',
    ]);
  });

  it('sin fecha de inicio no ocurre en ningún día', () => {
    expect(bookingOccurrences(booking())).toEqual([]);
  });
});

describe('eventsByDate', () => {
  it('agrupa por día y omite reservas canceladas o vencidas', () => {
    const map = eventsByDate([
      booking({ id: 'a', session: { id: 's1', date: '2026-11-23', startTime: '19:00', endTime: '20:00' } }, { title: 'Bachata' }),
      booking({ id: 'b', session: { id: 's2', date: '2026-11-23', startTime: '08:00', endTime: '09:00' } }, { title: 'Yoga' }),
      booking({ id: 'c', status: 'cancelled', session: { id: 's3', date: '2026-11-23', startTime: '10:00', endTime: '11:00' } }),
    ]);
    expect(map.get('2026-11-23')?.map(e => e.title)).toEqual(['Yoga', 'Bachata']);
    expect(map.size).toBe(1);
  });

  it('incluye las clases a las que ya asistió', () => {
    const map = eventsByDate([booking({ status: 'attended', session: { id: 's1', date: '2026-11-05', startTime: '19:00', endTime: '20:00' } })]);
    expect(map.get('2026-11-05')).toHaveLength(1);
  });
});

describe('assignClassColors', () => {
  it('da un color estable a cada clase, sin depender del orden de las reservas', () => {
    const a = booking({ id: 'x' }, { id: 'c-b' });
    const b = booking({ id: 'y' }, { id: 'c-a' });
    expect(assignClassColors([a, b]).get('c-a')).toBe(0);
    expect(assignClassColors([a, b]).get('c-b')).toBe(1);
    expect(assignClassColors([b, a]).get('c-b')).toBe(1);
  });

  it('una misma clase con varias reservas usa un solo color', () => {
    const m = assignClassColors([booking({ id: 'x' }, { id: 'c1' }), booking({ id: 'y' }, { id: 'c1' })]);
    expect(m.size).toBe(1);
  });
});

describe('nextEntry', () => {
  const map = eventsByDate([
    booking({ id: 'a', session: { id: 's1', date: '2026-11-10', startTime: '19:00', endTime: '20:00' } }, { title: 'Pasada' }),
    booking({ id: 'b', session: { id: 's2', date: '2026-11-20', startTime: '19:00', endTime: '20:00' } }, { title: 'Próxima' }),
    booking({ id: 'c', session: { id: 's3', date: '2026-11-25', startTime: '19:00', endTime: '20:00' } }, { title: 'Después' }),
  ]);

  it('devuelve la primera clase de hoy en adelante', () => {
    expect(nextEntry(map, '2026-11-13')?.title).toBe('Próxima');
    expect(nextEntry(map, '2026-11-20')?.title).toBe('Próxima');
    expect(nextEntry(map, '2026-11-21')?.title).toBe('Después');
  });

  it('devuelve undefined si no queda ninguna', () => {
    expect(nextEntry(map, '2026-12-01')).toBeUndefined();
  });
});

describe('monthLegend', () => {
  it('lista las clases del mes con cuántas veces ocurren', () => {
    const bookings = [
      booking({ id: 'a', session: { id: 's1', date: '2026-11-02', startTime: '19:00', endTime: '20:00' } }, { id: 'c1', title: 'Bachata' }),
      booking({ id: 'b', session: { id: 's2', date: '2026-11-09', startTime: '19:00', endTime: '20:00' } }, { id: 'c1', title: 'Bachata' }),
      booking({ id: 'c', session: { id: 's3', date: '2026-12-01', startTime: '19:00', endTime: '20:00' } }, { id: 'c2', title: 'Salsa' }),
    ];
    const legend = monthLegend(eventsByDate(bookings), assignClassColors(bookings), 2026, 10);
    expect(legend).toEqual([{ classId: 'c1', title: 'Bachata', colorIndex: 0, count: 2 }]);
  });
});
