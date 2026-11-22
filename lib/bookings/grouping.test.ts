import { describe, it, expect } from 'vitest';
import { groupTeacherBookings, groupUpcomingByClass, teacherSummary } from './grouping';
import { limaToDate } from './dates';
import type { TeacherBooking } from './types';

let n = 0;
function b(over: Partial<TeacherBooking> = {}): TeacherBooking {
  n += 1;
  return {
    id: `b${n}`, classId: 'c1', classTitle: 'Taller', studentId: `u${n}`, studentName: `Alumno ${n}`, seats: 1,
    status: 'confirmed', priceAmount: 0, currency: 'PEN', paymentMethod: 'free', createdAt: '2026-11-01T00:00:00Z',
    priorBookings: 0, priorNoShows: 0, ...over,
  };
}
const TODAY = '2026-11-13';

describe('groupTeacherBookings', () => {
  it('junta las reservas de la misma fecha de la misma clase y suma los cupos ocupados', () => {
    const g = groupTeacherBookings([
      b({ sessionId: 's1', sessionDate: '2026-11-20', seats: 2 }),
      b({ sessionId: 's1', sessionDate: '2026-11-20', seats: 1 }),
      b({ sessionId: 's1', sessionDate: '2026-11-20', seats: 3, status: 'cancelled' }),
    ], TODAY);
    expect(g.upcoming).toHaveLength(1);
    expect(g.upcoming[0]).toMatchObject({ date: '2026-11-20', taken: 3, daysAway: 7 });
    expect(g.upcoming[0].bookings).toHaveLength(3);
  });

  it('ordena las próximas de la más cercana a la más lejana', () => {
    const g = groupTeacherBookings([
      b({ sessionId: 's2', sessionDate: '2026-12-01' }),
      b({ sessionId: 's1', sessionDate: '2026-11-15' }),
    ], TODAY);
    expect(g.upcoming.map(x => x.date)).toEqual(['2026-11-15', '2026-12-01']);
  });

  it('hoy cuenta como próxima', () => {
    const g = groupTeacherBookings([b({ sessionId: 's1', sessionDate: TODAY })], TODAY);
    expect(g.upcoming).toHaveLength(1);
    expect(g.upcoming[0].daysAway).toBe(0);
  });

  it('ordena "por cerrar" de la más antigua a la más reciente (desempatando por hora) e "historial" de la más reciente a la más antigua', () => {
    const g = groupTeacherBookings([
      b({ sessionId: 'tc-newest', sessionDate: '2026-11-12', startTime: '19:00', endTime: '20:00' }),
      b({ sessionId: 'tc-same-late', sessionDate: '2026-11-10', startTime: '19:00', endTime: '20:30' }),
      b({ sessionId: 'tc-same-early-end', sessionDate: '2026-11-10', startTime: '19:00', endTime: '20:00' }),
      b({ sessionId: 'tc-oldest', sessionDate: '2026-11-10', startTime: '18:00', endTime: '19:00' }),
      b({ sessionId: 'h-older', sessionDate: '2026-11-02', startTime: '18:00', status: 'attended' }),
      b({ sessionId: 'h-newer', sessionDate: '2026-11-08', startTime: '18:00', status: 'attended' }),
    ], TODAY);
    expect(g.toClose.map(x => x.sessionId)).toEqual([
      'tc-oldest',
      'tc-same-early-end',
      'tc-same-late',
      'tc-newest',
    ]);
    expect(g.history.map(x => x.sessionId)).toEqual(['h-newer', 'h-older']);
  });

  it('una fecha pasada con reservas sin marcar va a "por cerrar"; el resto al historial', () => {
    const g = groupTeacherBookings([
      b({ sessionId: 's1', sessionDate: '2026-11-10' }),
      b({ sessionId: 's2', sessionDate: '2026-11-05', status: 'attended' }),
      b({ sessionId: 's3', sessionDate: '2026-11-04', status: 'cancelled' }),
    ], TODAY);
    expect(g.toClose.map(x => x.sessionId)).toEqual(['s1']);
    expect(g.history.map(x => x.sessionId)).toEqual(['s2', 's3']);
  });

  it('una clase completa (sin sesión) se agrupa por clase y usa la fecha de inicio', () => {
    const g = groupTeacherBookings([
      b({ sessionDate: '2026-11-22', capacity: 10 }),
      b({ sessionDate: '2026-11-22', capacity: 10, seats: 2 }),
    ], TODAY);
    expect(g.upcoming).toHaveLength(1);
    expect(g.upcoming[0]).toMatchObject({ taken: 3, capacity: 10, sessionId: undefined });
  });

  it('un curso completo en curso (start_date pasada, classEndDate vigente) permanece en próximas', () => {
    const g = groupTeacherBookings([
      b({ sessionDate: '2026-11-01', classEndDate: '2026-11-30', capacity: 10 }),
    ], TODAY);
    expect(g.upcoming).toHaveLength(1);
    expect(g.toClose).toHaveLength(0);
    expect(g.upcoming[0].endDate).toBe('2026-11-30');
  });

  it('sin fecha conocida se considera próxima', () => {
    expect(groupTeacherBookings([b()], TODAY).upcoming).toHaveLength(1);
  });

  it('Opción B: clase de hoy antes de endTime permanece en Próximas y tras endTime pasa a Por cerrar', () => {
    const todaySession = b({
      sessionId: 's-hoy',
      sessionDate: TODAY,
      startTime: '10:30',
      endTime: '11:30',
      status: 'confirmed',
    });

    const beforeEnd = groupTeacherBookings([todaySession], TODAY, limaToDate(TODAY, '11:29'));
    expect(beforeEnd.upcoming.map(x => x.sessionId)).toEqual(['s-hoy']);
    expect(beforeEnd.toClose).toHaveLength(0);

    const atEnd = groupTeacherBookings([todaySession], TODAY, limaToDate(TODAY, '11:30'));
    expect(atEnd.upcoming).toHaveLength(0);
    expect(atEnd.toClose.map(x => x.sessionId)).toEqual(['s-hoy']);
  });

  it('Opción B: clase de hoy ya terminada sin confirmados ni pendientes va directo a Historial', () => {
    const doneToday = b({
      sessionId: 's-done',
      sessionDate: TODAY,
      startTime: '09:00',
      endTime: '10:00',
      status: 'attended',
    });
    const g = groupTeacherBookings([doneToday], TODAY, limaToDate(TODAY, '10:05'));
    expect(g.upcoming).toHaveLength(0);
    expect(g.toClose).toHaveLength(0);
    expect(g.history.map(x => x.sessionId)).toEqual(['s-done']);
  });

  it('Opción B: clase de hoy sin endTime cae a Por cerrar tras startTime + 1h', () => {
    const noEnd = b({
      sessionId: 's-noend',
      sessionDate: TODAY,
      startTime: '14:00',
      status: 'confirmed',
    });
    expect(groupTeacherBookings([noEnd], TODAY, limaToDate(TODAY, '14:59')).upcoming).toHaveLength(1);
    expect(groupTeacherBookings([noEnd], TODAY, limaToDate(TODAY, '15:00')).toClose).toHaveLength(1);
  });

  it('Opción B: clase completa (sin sessionId) usa classEndDate + endTime para pasar a Por cerrar', () => {
    const whole = b({
      sessionDate: '2026-11-10',
      classEndDate: TODAY,
      startTime: '18:00',
      endTime: '20:00',
      status: 'confirmed',
    });
    expect(groupTeacherBookings([whole], TODAY, limaToDate(TODAY, '19:30')).upcoming).toHaveLength(1);
    expect(groupTeacherBookings([whole], TODAY, limaToDate(TODAY, '20:05')).toClose).toHaveLength(1);
  });
});

describe('groupUpcomingByClass', () => {
  it('agrupa sesiones próximas de la misma clase en una sola tarjeta ordenada por su fecha más cercana', () => {
    const { upcoming } = groupTeacherBookings([
      b({ classId: 'c-b', classTitle: 'Bachata', sessionId: 'sb1', sessionDate: '2026-11-18', seats: 2 }),
      b({ classId: 'c-a', classTitle: 'Salsa', sessionId: 'sa2', sessionDate: '2026-11-25', seats: 1 }),
      b({ classId: 'c-a', classTitle: 'Salsa', sessionId: 'sa1', sessionDate: '2026-11-15', seats: 3, status: 'pending_confirmation' }),
    ], TODAY);

    const byClass = groupUpcomingByClass(upcoming);
    expect(byClass.map(c => c.classId)).toEqual(['c-a', 'c-b']);
    expect(byClass[0]).toMatchObject({
      classTitle: 'Salsa',
      isWholeClass: false,
      totalTaken: 4,
      totalPendingCount: 1,
      nextDate: '2026-11-15',
    });
    expect(byClass[0].dates.map(d => d.sessionId)).toEqual(['sa1', 'sa2']);
  });
});

describe('teacherSummary', () => {
  it('resume lo que le importa al profesor incluyendo pendientes de confirmación', () => {
    const groups = groupTeacherBookings([
      b({ sessionId: 's1', sessionDate: '2026-11-14', seats: 2, status: 'pending_confirmation' }),
      b({ sessionId: 's1', sessionDate: '2026-11-14' }),
      b({ sessionId: 's2', sessionDate: '2026-11-30' }),
      b({ sessionId: 's3', sessionDate: '2026-11-10', status: 'pending_confirmation' }),
    ], TODAY);
    expect(groups.upcoming[0]).toMatchObject({ taken: 3, pendingCount: 1, pendingSeats: 2 });
    expect(groups.toClose).toHaveLength(1);
    expect(teacherSummary(groups)).toEqual({ upcomingPeople: 4, nextDate: '2026-11-14', toClose: 1, pendingCount: 2 });
  });

  it('sin próximas deja nextDate vacío', () => {
    expect(teacherSummary(groupTeacherBookings([], TODAY))).toEqual({ upcomingPeople: 0, nextDate: undefined, toClose: 0, pendingCount: 0 });
  });
});
