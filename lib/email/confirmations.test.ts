import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

const { mockEnqueue, mockCreateToken } = vi.hoisted(() => ({
  mockEnqueue: vi.fn(),
  mockCreateToken: vi.fn(),
}));

vi.mock('./outbox', async (orig) => ({
  ...(await orig<typeof import('./outbox')>()),
  enqueueEmail: mockEnqueue,
}));
vi.mock('@/lib/bookings/tokens', () => ({
  createBookingActionToken: mockCreateToken,
}));

import { processPendingConfirmations } from './confirmations';

function makeAdmin(opts: {
  expired?: number;
  attended?: number;
  autoCloseError?: { message: string } | null;
  pendingRows?: unknown[];
  existingDedupeKeys?: string[];
  profiles?: unknown[];
}) {
  return {
    rpc: vi.fn(async (fn: string) => {
      if (fn === 'auto_close_past_bookings') {
        if (opts.autoCloseError) return { data: null, error: opts.autoCloseError };
        return {
          data: [{ expired_count: opts.expired ?? 0, attended_count: opts.attended ?? 0 }],
          error: null,
        };
      }
      if (fn === 'expire_unconfirmed_bookings') {
        return { data: opts.expired ?? 0, error: null };
      }
      throw new Error(`Unexpected rpc ${fn}`);
    }),
    from: vi.fn((table: string) => {
      if (table === 'bookings') {
        return {
          select: () => ({
            eq: async () => ({ data: opts.pendingRows ?? [], error: null }),
          }),
        };
      }
      if (table === 'email_outbox') {
        return {
          select: () => ({
            in: async () => ({
              data: (opts.existingDedupeKeys ?? []).map(k => ({ dedupe_key: k })),
              error: null,
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: () => ({
            in: async () => ({
              data: opts.profiles ?? [
                { id: 'u1', name: 'Valentina', whatsapp: '+51 987 654 321', instagram: 'vale' },
                { id: 'u2', name: 'Mateo', whatsapp: null, instagram: 'mateo' },
              ],
              error: null,
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    }),
    auth: {
      admin: {
        getUserById: vi.fn(async () => ({ data: { user: { email: 'profe@kynea.dance' } } })),
      },
    },
  } as unknown as SupabaseClient;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEnqueue.mockResolvedValue(true);
  mockCreateToken.mockResolvedValue('tok_xyz');
});

describe('processPendingConfirmations', () => {
  it('envía 1 correo agrupado pre-clase cuando entra en reminder_hours_before y 1 último aviso ~12h post-clase', async () => {
    // 2026-11-20 17:00 Lima = 2026-11-20T22:00:00Z
    const now = new Date('2026-11-20T22:00:00Z');
    const admin = makeAdmin({
      expired: 2,
      attended: 5,
      pendingRows: [
        // Sesión en 2 horas (19:00 Lima), reminder configurado en 4h -> DUE pre_class (2 alumnos agrupados)
        {
          id: 'b1', user_id: 'u1', class_id: 'c1', session_id: 's1', seats: 2, price_amount: 80, currency: 'PEN',
          student_note: null, student_whatsapp: '+51 987 654 321', student_instagram: null,
          class: { id: 'c1', title: 'Salsa', modality: 'Presencial', start_date: '2026-11-01', end_date: null, teacher_id: 't1', reminder_hours_before: 4, class_schedules: [] },
          session: { id: 's1', session_date: '2026-11-20', start_time: '19:00:00', end_time: '20:00:00' },
        },
        {
          id: 'b2', user_id: 'u2', class_id: 'c1', session_id: 's1', seats: 1, price_amount: 40, currency: 'PEN',
          student_note: 'Pago hoy', student_whatsapp: null, student_instagram: 'mateo',
          class: { id: 'c1', title: 'Salsa', modality: 'Presencial', start_date: '2026-11-01', end_date: null, teacher_id: 't1', reminder_hours_before: 4, class_schedules: [] },
          session: { id: 's1', session_date: '2026-11-20', start_time: '19:00:00', end_time: '20:00:00' },
        },
        // Sesión que terminó hace 18h (2026-11-19 23:00 Lima) -> DUE post_class (~12h)
        {
          id: 'b3', user_id: 'u1', class_id: 'c2', session_id: 's2', seats: 1, price_amount: 50, currency: 'PEN',
          student_note: null, student_whatsapp: '+51 987 654 321', student_instagram: null,
          class: { id: 'c2', title: 'Bachata', modality: 'Presencial', start_date: '2026-11-01', end_date: null, teacher_id: 't1', reminder_hours_before: 24, class_schedules: [] },
          session: { id: 's2', session_date: '2026-11-19', start_time: '22:00:00', end_time: '23:00:00' },
        },
        // Sesión en 72h (fuera de ventana de 24h) -> NO se envía todavía
        {
          id: 'b4', user_id: 'u1', class_id: 'c3', session_id: 's3', seats: 1, price_amount: 50, currency: 'PEN',
          student_note: null, student_whatsapp: null, student_instagram: null,
          class: { id: 'c3', title: 'Heels', modality: 'Presencial', start_date: '2026-11-01', end_date: null, teacher_id: 't1', reminder_hours_before: 24, class_schedules: [] },
          session: { id: 's3', session_date: '2026-11-23', start_time: '19:00:00', end_time: '20:00:00' },
        },
      ],
    });

    const res = await processPendingConfirmations(admin, now);
    expect(res).toEqual({ expired: 2, attended: 5, preReminders: 1, postReminders: 1 });
    expect(admin.rpc).toHaveBeenCalledWith('auto_close_past_bookings', { p_grace_hours: 48 });
    expect(mockEnqueue).toHaveBeenCalledTimes(2);

    const preCall = mockEnqueue.mock.calls.find(c => c[1].payload.kind === 'pre_class')![1];
    expect(preCall.dedupeKey).toBe('teacher_pending_pre:session:s1:4h');
    expect(preCall.payload.items).toHaveLength(2);

    const postCall = mockEnqueue.mock.calls.find(c => c[1].payload.kind === 'post_class')![1];
    expect(postCall.dedupeKey).toBe('teacher_pending_post12h:session:s2');
    expect(postCall.payload.items).toHaveLength(1);
    expect(mockCreateToken).toHaveBeenCalledTimes(3);
  });

  it('no emite tokens ni reenvía correos si el dedupeKey ya existe en email_outbox', async () => {
    const now = new Date('2026-11-20T22:00:00Z');
    const admin = makeAdmin({
      existingDedupeKeys: ['teacher_pending_pre:session:s1:4h'],
      pendingRows: [
        {
          id: 'b1', user_id: 'u1', class_id: 'c1', session_id: 's1', seats: 1, price_amount: 40, currency: 'PEN',
          student_note: null, student_whatsapp: null, student_instagram: null,
          class: { id: 'c1', title: 'Salsa', modality: 'Presencial', start_date: '2026-11-01', end_date: null, teacher_id: 't1', reminder_hours_before: 4, class_schedules: [] },
          session: { id: 's1', session_date: '2026-11-20', start_time: '19:00:00', end_time: '20:00:00' },
        },
      ],
    });

    const res = await processPendingConfirmations(admin, now);
    expect(res).toEqual({ expired: 0, attended: 0, preReminders: 0, postReminders: 0 });
    expect(mockCreateToken).not.toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('si auto_close_past_bookings falla (ej. entorno sin migración 79), hace fallback a expire_unconfirmed_bookings', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const now = new Date('2026-11-20T22:00:00Z');
    const admin = makeAdmin({
      expired: 3,
      autoCloseError: { message: 'function auto_close_past_bookings does not exist' },
    });

    const res = await processPendingConfirmations(admin, now);
    expect(res).toEqual({ expired: 3, attended: 0, preReminders: 0, postReminders: 0 });
    expect(admin.rpc).toHaveBeenCalledWith('auto_close_past_bookings', { p_grace_hours: 48 });
    expect(admin.rpc).toHaveBeenCalledWith('expire_unconfirmed_bookings', { p_grace_hours: 48 });
    errSpy.mockRestore();
  });
});
