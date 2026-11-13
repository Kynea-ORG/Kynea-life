import { describe, it, expect } from 'vitest';
import { checkClassEditGuard, summarizeBookings, deleteBlockedReason } from './guards';

describe('summarizeBookings', () => {
  it('cuenta reservas activas y cupos de la clase completa', () => {
    const s = summarizeBookings([
      { status: 'confirmed', seats: 2, session_id: null },
      { status: 'attended', seats: 1, session_id: null },
      { status: 'cancelled', seats: 5, session_id: null },
      { status: 'confirmed', seats: 1, session_id: 's1' },
    ]);
    expect(s).toEqual({ total: 4, active: 2, classSeatsTaken: 3 });
  });
});

describe('checkClassEditGuard', () => {
  const base = { currentMode: 'class' as const, newMode: 'class' as const, newMaxSpots: 10, stats: { total: 3, active: 2, classSeatsTaken: 4 } };

  it('permite editar sin tocar modo ni cupo', () => {
    expect(checkClassEditGuard(base)).toEqual({ ok: true });
  });

  it('bloquea cambiar el modo de reserva con reservas activas', () => {
    expect(checkClassEditGuard({ ...base, newMode: 'none' })).toEqual({ ok: false, code: 'HAS_ACTIVE_BOOKINGS' });
  });

  it('permite cambiar el modo si no hay reservas activas', () => {
    expect(checkClassEditGuard({ ...base, newMode: 'session', stats: { total: 1, active: 0, classSeatsTaken: 0 } })).toEqual({ ok: true });
  });

  it('bloquea bajar el cupo por debajo de lo ya reservado', () => {
    expect(checkClassEditGuard({ ...base, newMaxSpots: 3 })).toEqual({ ok: false, code: 'CAPACITY_BELOW_BOOKINGS' });
  });

  it('permite bajar el cupo hasta lo reservado e ilimitado (null)', () => {
    expect(checkClassEditGuard({ ...base, newMaxSpots: 4 })).toEqual({ ok: true });
    expect(checkClassEditGuard({ ...base, newMaxSpots: null })).toEqual({ ok: true });
  });
});

describe('deleteBlockedReason', () => {
  it('no bloquea una clase sin reservas', () => {
    expect(deleteBlockedReason({ total: 0, active: 0, classSeatsTaken: 0 })).toBeNull();
  });
  it('pide cancelar primero si hay reservas activas', () => {
    expect(deleteBlockedReason({ total: 2, active: 1, classSeatsTaken: 1 })).toMatch(/cancela/i);
  });
  it('sugiere archivar si solo queda historial', () => {
    expect(deleteBlockedReason({ total: 2, active: 0, classSeatsTaken: 1 })).toMatch(/arch/i);
  });
});
