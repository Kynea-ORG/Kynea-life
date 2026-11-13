import { describe, it, expect } from 'vitest';
import { groupTeacherBookings, teacherSummary } from './grouping';
import type { TeacherBooking } from './types';

let n = 0;
function b(over: Partial<TeacherBooking> = {}): TeacherBooking {
  n += 1;
  return {
    id: `b${n}`, classId: 'c1', classTitle: 'Taller', studentId: `u${n}`, studentName: `Alumno ${n}`, seats: 1,
    status: 'confirmed', priceAmount: 0, currency: 'PEN', paymentMethod: 'free', createdAt: '2026-11-01T00:00:00Z',
    priorBookings: 0, ...over,
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

  it('sin fecha conocida se considera próxima', () => {
    expect(groupTeacherBookings([b()], TODAY).upcoming).toHaveLength(1);
  });
});

describe('teacherSummary', () => {
  it('resume lo que le importa al profesor', () => {
    const groups = groupTeacherBookings([
      b({ sessionId: 's1', sessionDate: '2026-11-14', seats: 2 }),
      b({ sessionId: 's1', sessionDate: '2026-11-14' }),
      b({ sessionId: 's2', sessionDate: '2026-11-30' }),
      b({ sessionId: 's3', sessionDate: '2026-11-10' }),
    ], TODAY);
    expect(teacherSummary(groups)).toEqual({ upcomingPeople: 4, nextDate: '2026-11-14', toClose: 1 });
  });

  it('sin próximas deja nextDate vacío', () => {
    expect(teacherSummary(groupTeacherBookings([], TODAY))).toEqual({ upcomingPeople: 0, nextDate: undefined, toClose: 0 });
  });
});
