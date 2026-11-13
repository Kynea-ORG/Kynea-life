import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { enqueueBookingReminders } from './reminders';

const enqueue = vi.fn();
vi.mock('./outbox', async (orig) => ({ ...(await orig<typeof import('./outbox')>()), enqueueEmail: (...a: unknown[]) => enqueue(...a) }));

const booking = (over: Record<string, unknown> = {}) => ({
  id: 'b1', user_id: 'u1', seats: 1, price_amount: 0, currency: 'PEN', payment_method: 'free', status: 'confirmed',
  class: { id: 'c1', title: 'Taller', slug: 's', type: 'taller', modality: 'Presencial', start_date: '2026-11-14', end_date: null,
    cancellation_policy: 'flexible', footwear: [], clothing: null, to_bring: [], venue: null, teacher: { name: 'Carlos' } },
  session: null, ...over,
});

const inCalls: unknown[][] = [];

function makeAdmin(rows: unknown[]) {
  // Las dos consultas (por fecha y por clase completa) devuelven las mismas filas de prueba.
  const builder = {
    eq: () => builder, in: (...a: unknown[]) => { inCalls.push(a); return builder; }, is: () => builder,
    then: (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null }),
  };
  return {
    from: () => ({ select: () => builder }),
    auth: { admin: { getUserById: async (id: string) => ({ data: { user: { email: `${id}@mail.com` } } }) } },
  } as unknown as SupabaseClient;
}

describe('enqueueBookingReminders', () => {
  it('el mismo día de la clase manda el aviso de "hoy" (daysAway 0)', async () => {
    enqueue.mockReset();
    const n = await enqueueBookingReminders(makeAdmin([booking({ class: { ...booking().class, start_date: '2026-11-13' } })]), '2026-11-13');
    expect(n).toBe(1);
    expect(enqueue.mock.calls[0][1].payload).toMatchObject({ daysAway: 0 });
    expect(enqueue.mock.calls[0][1].dedupeKey).toBe('booking_reminder:b1:2026-11-13:0');
  });

  it('encola un recordatorio para las reservas cuya clase es mañana', async () => {
    enqueue.mockReset();
    const n = await enqueueBookingReminders(makeAdmin([
      booking(),
      booking({ id: 'b2', session: { session_date: '2026-11-14', start_time: '19:00:00', end_time: '20:00:00' } }),
      booking({ id: 'b3', session: { session_date: '2026-11-20', start_time: '19:00:00', end_time: '20:00:00' } }),
    ]), '2026-11-13');
    expect(n).toBe(2);
    expect(enqueue.mock.calls.map(c => c[1].dedupeKey).sort()).toEqual(['booking_reminder:b1:2026-11-14:1', 'booking_reminder:b2:2026-11-14:1']);
    expect(enqueue.mock.calls[0][1]).toMatchObject({ to: 'u1@mail.com', template: 'booking_reminder' });
    expect(enqueue.mock.calls[0][1].payload).toMatchObject({ daysAway: 1, teacherName: 'Carlos' });
  });

  it('ignora clases completas que empezaron antes (cursos en curso)', async () => {
    enqueue.mockReset();
    const n = await enqueueBookingReminders(makeAdmin([booking({ class: { ...booking().class, start_date: '2026-11-01', end_date: '2026-12-01' } })]), '2026-11-13');
    expect(n).toBe(0);
  });

  it('pide a la base solo las clases de hoy y mañana, no todas las reservas', async () => {
    enqueue.mockReset();
    inCalls.length = 0;
    await enqueueBookingReminders(makeAdmin([]), '2026-11-30');
    expect(inCalls).toEqual([
      ['session.session_date', ['2026-11-30', '2026-12-01']],
      ['class.start_date', ['2026-11-30', '2026-12-01']],
    ]);
  });

  it('no duplica una reserva que aparece en ambas consultas', async () => {
    enqueue.mockReset();
    const n = await enqueueBookingReminders(makeAdmin([booking()]), '2026-11-13');
    expect(n).toBe(1);
  });
});
