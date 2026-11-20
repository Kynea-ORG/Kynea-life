import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { enqueueCancellationEmails } from './cancellations';

const enqueue = vi.fn();
vi.mock('./outbox', async (orig) => ({ ...(await orig<typeof import('./outbox')>()), enqueueEmail: (...a: unknown[]) => enqueue(...a) }));

const row = (over: Record<string, unknown> = {}) => ({
  id: 'b1', user_id: 'student1', seats: 1, price_amount: 0, currency: 'PEN', payment_method: 'free', status: 'cancelled',
  cancel_reason: 'Fecha cancelada por el profesor', student_note: null,
  class: { id: 'c1', title: 'Taller', slug: 's', type: 'taller', modality: 'Presencial', start_date: '2026-11-23', end_date: null,
    cancellation_policy: 'flexible', footwear: [], clothing: null, to_bring: [], teacher_id: 'teacher1', venue: null, teacher: { name: 'Carlos' } },
  session: null, ...over,
});

function makeAdmin(rows: Record<string, unknown>) {
  return {
    from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: table === 'profiles' ? { name: 'Valentina' } : rows[table] ?? rows.bookings, error: null }) }) }) }),
    auth: { admin: { getUserById: async (id: string) => ({ data: { user: { email: `${id}@mail.com` } } }) } },
  } as unknown as SupabaseClient;
}

beforeEach(() => enqueue.mockReset());

describe('enqueueCancellationEmails', () => {
  it('si cancela el profesor, avisa al alumno', async () => {
    await enqueueCancellationEmails(makeAdmin({ bookings: row() }), ['b1'], 'teacher1');
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0][1]).toMatchObject({ to: 'student1@mail.com', template: 'booking_cancelled', dedupeKey: 'booking_cancelled:b1' });
    expect(enqueue.mock.calls[0][1].payload).toMatchObject({ reason: 'Fecha cancelada por el profesor', teacherName: 'Carlos' });
  });

  it('si cancela el alumno, avisa al profesor', async () => {
    await enqueueCancellationEmails(makeAdmin({ bookings: row({ cancel_reason: null }) }), ['b1'], 'student1');
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0][1]).toMatchObject({ to: 'teacher1@mail.com', template: 'booking_cancelled_by_student', dedupeKey: 'booking_cancelled_teacher:b1' });
    expect(enqueue.mock.calls[0][1].payload).toMatchObject({ studentName: 'Valentina' });
  });

  it('no hace nada con una lista vacía', async () => {
    await enqueueCancellationEmails(makeAdmin({ bookings: row() }), [], 'teacher1');
    expect(enqueue).not.toHaveBeenCalled();
  });
});
