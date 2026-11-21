import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  computeTokenExpiry,
  executeBookingActionByToken,
  hashActionToken,
  loadBookingActionByToken,
  TEACHER_RELEASE_REASON,
} from './tokens';

function makeMockAdmin(opts: {
  tokenRow: Record<string, unknown> | null;
  bookingRow: Record<string, unknown> | null;
  studentProfile?: Record<string, unknown> | null;
  claimOk?: boolean;
  updateStatus?: string | null;
}) {
  const updates: Array<{ table: string; values: Record<string, unknown> }> = [];
  const admin = {
    from: vi.fn((table: string) => {
      if (table === 'booking_action_tokens') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => (opts.tokenRow ? { data: opts.tokenRow, error: null } : { data: null, error: { message: 'not found' } }),
            }),
          }),
          update: (values: Record<string, unknown>) => {
            updates.push({ table, values });
            return {
              eq: () => ({
                is: () => ({
                  gt: () => ({
                    select: () => ({
                      maybeSingle: async () => (opts.claimOk === false ? { data: null, error: null } : { data: { booking_id: 'b1' }, error: null }),
                    }),
                  }),
                }),
              }),
            };
          },
        };
      }
      if (table === 'bookings') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => (opts.bookingRow ? { data: opts.bookingRow, error: null } : { data: null, error: { message: 'not found' } }),
            }),
          }),
          update: (values: Record<string, unknown>) => {
            updates.push({ table, values });
            return {
              eq: () => ({
                eq: () => ({
                  select: () => ({
                    maybeSingle: async () => (opts.updateStatus ? { data: { status: opts.updateStatus }, error: null } : { data: null, error: null }),
                  }),
                }),
              }),
            };
          },
        };
      }
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: opts.studentProfile ?? { name: 'Valentina', whatsapp: '+51 999 000 111', instagram: 'vale' }, error: null }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    }),
  } as unknown as SupabaseClient;

  return { admin, updates };
}

const VALID_TOKEN = 'abcdefghijklmnopqrstuvwxyz123456';
const NOW = new Date('2026-11-20T15:00:00Z');
const BASE_BOOKING = {
  id: 'b1',
  user_id: 'u1',
  status: 'pending_confirmation',
  seats: 2,
  price_amount: 80,
  currency: 'PEN',
  student_note: 'Voy con una amiga',
  student_whatsapp: '+51 987 654 321',
  student_instagram: 'valedance',
  class: { id: 'c1', title: 'Bachata', modality: 'Presencial', start_date: '2026-11-23', teacher_id: 't1', class_schedules: [] },
  session: { session_date: '2026-11-23', start_time: '19:00:00', end_time: '20:00:00' },
};

describe('booking action tokens', () => {
  it('hashea tokens de forma determinista con SHA-256 y calcula expiración mínima de 72h', () => {
    expect(hashActionToken('abc')).toBe(hashActionToken('  abc  '));
    expect(hashActionToken('abc')).toHaveLength(64);

    const exp = computeTokenExpiry({ date: '2026-11-20', startTime: '19:00', now: NOW });
    expect(exp.getTime()).toBeGreaterThanOrEqual(NOW.getTime() + 72 * 3_600_000);
  });

  it('loadBookingActionByToken inspecciona sin mutar DB (protegido contra scanners GET)', async () => {
    const { admin, updates } = makeMockAdmin({
      tokenRow: { booking_id: 'b1', teacher_id: 't1', expires_at: '2026-11-26T00:00:00Z', used_at: null },
      bookingRow: BASE_BOOKING,
    });
    const res = await loadBookingActionByToken(admin, VALID_TOKEN, NOW);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.used).toBe(false);
      expect(res.booking).toMatchObject({
        bookingId: 'b1',
        status: 'pending_confirmation',
        studentName: 'Valentina',
        studentWhatsapp: '+51 987 654 321',
        studentInstagram: 'valedance',
      });
    }
    expect(updates).toHaveLength(0);
  });

  it('detecta tokens vencidos o faltantes', async () => {
    const { admin } = makeMockAdmin({
      tokenRow: { booking_id: 'b1', teacher_id: 't1', expires_at: '2026-11-19T00:00:00Z', used_at: null },
      bookingRow: BASE_BOOKING,
    });
    expect(await loadBookingActionByToken(admin, '', NOW)).toEqual({ ok: false, reason: 'missing' });
    expect(await loadBookingActionByToken(admin, VALID_TOKEN, NOW)).toEqual({ ok: false, reason: 'expired' });
  });

  it('executeBookingActionByToken confirma atómicamente una reserva pendiente', async () => {
    const { admin, updates } = makeMockAdmin({
      tokenRow: { booking_id: 'b1', teacher_id: 't1', expires_at: '2026-11-26T00:00:00Z', used_at: null },
      bookingRow: BASE_BOOKING,
      updateStatus: 'confirmed',
    });
    const res = await executeBookingActionByToken(admin, VALID_TOKEN, 'confirm', NOW);
    expect(res).toEqual({ ok: true, outcome: 'confirmed', currentStatus: 'confirmed', bookingId: 'b1', teacherId: 't1' });
    expect(updates.find(u => u.table === 'bookings')?.values).toMatchObject({
      status: 'confirmed',
      confirmed_by: 't1',
    });
  });

  it('executeBookingActionByToken libera el cupo cuando el profesor elige release', async () => {
    const { admin, updates } = makeMockAdmin({
      tokenRow: { booking_id: 'b1', teacher_id: 't1', expires_at: '2026-11-26T00:00:00Z', used_at: null },
      bookingRow: BASE_BOOKING,
      updateStatus: 'cancelled',
    });
    const res = await executeBookingActionByToken(admin, VALID_TOKEN, 'release', NOW);
    expect(res).toEqual({ ok: true, outcome: 'released', currentStatus: 'cancelled', bookingId: 'b1', teacherId: 't1' });
    expect(updates.find(u => u.table === 'bookings')?.values).toMatchObject({
      status: 'cancelled',
      cancelled_by: 't1',
      cancel_reason: TEACHER_RELEASE_REASON,
    });
  });

  it('es idempotente si el token ya fue usado o la reserva ya estaba confirmada', async () => {
    const { admin, updates } = makeMockAdmin({
      tokenRow: { booking_id: 'b1', teacher_id: 't1', expires_at: '2026-11-26T00:00:00Z', used_at: '2026-11-20T14:00:00Z' },
      bookingRow: { ...BASE_BOOKING, status: 'confirmed' },
    });
    const res = await executeBookingActionByToken(admin, VALID_TOKEN, 'confirm', NOW);
    expect(res).toEqual({ ok: true, outcome: 'already_resolved', currentStatus: 'confirmed', bookingId: 'b1', teacherId: 't1' });
    expect(updates).toHaveLength(0);
  });
});
