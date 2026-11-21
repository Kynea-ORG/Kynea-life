import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockCancelEmails,
  mockApprovedEmail,
  mockCreateToken,
  mockGetUser,
  mockRpc,
  mockCheckRateLimit,
  mockEnqueue,
  mockAdmin,
  mockBookingRow,
  mockGetUserById,
} = vi.hoisted(() => ({
  mockCancelEmails: vi.fn(),
  mockApprovedEmail: vi.fn(),
  mockCreateToken: vi.fn(),
  mockGetUser: vi.fn(),
  mockRpc: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockEnqueue: vi.fn(),
  mockAdmin: vi.fn(),
  mockBookingRow: vi.fn(),
  mockGetUserById: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser }, rpc: mockRpc })),
}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mockAdmin }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/server', () => ({ after: (fn: () => unknown) => { void fn(); } }));
vi.mock('@/lib/cache', () => ({ safeRevalidateTag: vi.fn() }));
vi.mock('@/lib/email/send', () => ({ dispatchOutbox: vi.fn(async () => ({ sent: 0, failed: 0, skipped: 0 })) }));
vi.mock('@/lib/email/cancellations', () => ({ enqueueCancellationEmails: mockCancelEmails }));
vi.mock('@/lib/email/confirmations', () => ({ enqueueBookingApprovedEmail: mockApprovedEmail }));
vi.mock('./tokens', () => ({ createBookingActionToken: mockCreateToken }));
vi.mock('@/lib/ratelimit', () => ({ bookingRateLimiter: {}, checkRateLimit: mockCheckRateLimit }));
vi.mock('@/lib/email/outbox', async (orig) => ({
  ...(await orig<typeof import('@/lib/email/outbox')>()),
  enqueueEmail: mockEnqueue,
}));

import {
  reserveBooking,
  confirmBooking,
  cancelBooking,
  setBookingAttendance,
  cancelClassSession,
  listClassSessions,
} from './actions';

const USER = { id: 'u1', email: 'alumna@mail.com' };
const BOOKING_ROW = {
  id: 'b1', status: 'confirmed', seats: 1, price_amount: 0, currency: 'PEN', payment_method: 'free', user_id: 'u1',
  class: { id: 'c1', title: 'Taller', slug: 's', type: 'taller', modality: 'Presencial', start_date: '2026-11-23', end_date: null,
    cancellation_policy: 'moderada', contact_mode: 'whatsapp', footwear: [], clothing: null, to_bring: [], teacher_id: 't1', venue: null },
  session: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockEnqueue.mockReset().mockResolvedValue(true);
  mockApprovedEmail.mockReset().mockResolvedValue(true);
  mockCreateToken.mockReset().mockResolvedValue('tok-123');
  mockGetUser.mockResolvedValue({ data: { user: USER } });
  mockCheckRateLimit.mockResolvedValue({ success: true });
  mockRpc.mockResolvedValue({ data: 'b1', error: null });
  mockBookingRow.mockResolvedValue({ data: BOOKING_ROW, error: null });
  mockGetUserById.mockResolvedValue({ data: { user: { email: 'profe@mail.com' } } });
  mockAdmin.mockReturnValue({
    from: () => ({ select: () => ({ eq: () => ({ single: mockBookingRow }) }) }),
    auth: { admin: { getUserById: mockGetUserById } },
  });
});

describe('reserveBooking', () => {
  it('sin sesión lanza y no llama a la base', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(reserveBooking({ classId: 'c1' })).rejects.toThrow('No autenticado');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('respeta el límite de intentos', async () => {
    mockCheckRateLimit.mockResolvedValue({ success: false });
    const r = await reserveBooking({ classId: 'c1' });
    expect(r).toMatchObject({ ok: false, error: { code: 'RATE_LIMITED' } });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('llama a reserve_booking con los parámetros y contacto saneado', async () => {
    const r = await reserveBooking({
      classId: 'c1', sessionId: 's1', seats: 2, whatsapp: ' +51 999 888 777 ', instagram: 'https://instagram.com/valebaila/',
    });
    expect(mockRpc).toHaveBeenCalledWith('reserve_booking', {
      p_class_id: 'c1',
      p_session_id: 's1',
      p_seats: 2,
      p_note: null,
      p_whatsapp: '+51 999 888 777',
      p_instagram: 'valebaila',
    });
    expect(r).toEqual({ ok: true, data: { bookingId: 'b1', status: 'confirmed' } });
  });

  it('envía la nota al profesor recortada', async () => {
    await reserveBooking({ classId: 'c1', note: '  Vengo con una lesión leve  ' });
    expect(mockRpc).toHaveBeenCalledWith('reserve_booking', expect.objectContaining({ p_note: 'Vengo con una lesión leve' }));
  });

  it('usa 1 cupo y sin sesión por defecto', async () => {
    await reserveBooking({ classId: 'c1' });
    expect(mockRpc).toHaveBeenCalledWith('reserve_booking', {
      p_class_id: 'c1', p_session_id: null, p_seats: 1, p_note: null, p_whatsapp: null, p_instagram: null,
    });
  });

  it('traduce el error de la base a un mensaje para el usuario', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'SOLD_OUT' } });
    const r = await reserveBooking({ classId: 'c1' });
    expect(r).toMatchObject({ ok: false, error: { code: 'SOLD_OUT' } });
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('en clase gratuita encola booking_confirmed para el alumno y booking_received sin token para el profesor', async () => {
    await reserveBooking({ classId: 'c1' });
    const keys = mockEnqueue.mock.calls.map(c => c[1].dedupeKey).sort();
    expect(keys).toEqual(['booking_confirmed:b1', 'booking_received:b1']);
    expect(mockCreateToken).not.toHaveBeenCalled();
    const toStudent = mockEnqueue.mock.calls.find(c => c[1].template === 'booking_confirmed')![1];
    const toTeacher = mockEnqueue.mock.calls.find(c => c[1].template === 'booking_received')![1];
    expect(toStudent.to).toBe('alumna@mail.com');
    expect(toTeacher.to).toBe('profe@mail.com');
  });

  it('en clase de pago (pending_confirmation) encola booking_pending y crea token 1-tap para el profesor', async () => {
    mockBookingRow.mockResolvedValue({
      data: {
        ...BOOKING_ROW,
        status: 'pending_confirmation',
        price_amount: 50,
        payment_method: 'pay_at_venue',
        student_whatsapp: '+51 987 654 321',
        student_instagram: 'vale',
      },
      error: null,
    });
    const r = await reserveBooking({ classId: 'c1', whatsapp: '+51 987 654 321' });
    expect(r).toEqual({ ok: true, data: { bookingId: 'b1', status: 'pending_confirmation' } });
    expect(mockCreateToken).toHaveBeenCalledTimes(1);
    const toStudent = mockEnqueue.mock.calls.find(c => c[1].template === 'booking_pending')![1];
    const toTeacher = mockEnqueue.mock.calls.find(c => c[1].template === 'booking_received')![1];
    expect(toStudent.dedupeKey).toBe('booking_pending:b1');
    expect(toTeacher.payload).toMatchObject({
      status: 'pending_confirmation',
      actionToken: 'tok-123',
      studentWhatsapp: '+51 987 654 321',
      studentInstagram: 'vale',
    });
  });

  it('si falla el correo, la reserva igual queda hecha', async () => {
    mockEnqueue.mockRejectedValue(new Error('smtp'));
    const r = await reserveBooking({ classId: 'c1' });
    expect(r).toMatchObject({ ok: true, data: { bookingId: 'b1' } });
  });

  it('con múltiples sessionIds llama a reserve_bookings con 1 rate limit y encola correos para todas', async () => {
    mockRpc.mockResolvedValue({ data: ['b1', 'b2'], error: null });
    const r = await reserveBooking({ classId: 'c1', sessionIds: ['s1', 's2'], seats: 2, note: '  Vamos juntos ', whatsapp: '+51999111222' });
    expect(mockCheckRateLimit).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('reserve_bookings', {
      p_class_id: 'c1',
      p_session_ids: ['s1', 's2'],
      p_seats: 2,
      p_note: 'Vamos juntos',
      p_whatsapp: '+51999111222',
      p_instagram: null,
    });
    expect(r).toEqual({ ok: true, data: { bookingId: 'b1', bookingIds: ['b1', 'b2'], status: 'confirmed' } });
    expect(mockGetUserById).toHaveBeenCalledTimes(1);
    const keys = mockEnqueue.mock.calls.map(c => c[1].dedupeKey).sort();
    expect(keys).toEqual([
      'booking_confirmed:b1',
      'booking_confirmed:b2',
      'booking_received:b1',
      'booking_received:b2',
    ]);
  });

  it('traduce INVALID_SESSIONS si reserve_bookings rechaza la selección', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'INVALID_SESSIONS' } });
    const r = await reserveBooking({ classId: 'c1', sessionIds: ['s1', 's1'] });
    expect(r).toMatchObject({ ok: false, error: { code: 'INVALID_SESSIONS' } });
    expect(mockEnqueue).not.toHaveBeenCalled();
  });
});

describe('confirmBooking / cancelBooking / setBookingAttendance / cancelClassSession', () => {
  it('confirmBooking llama a la RPC y encola booking_approved si realmente transicionó', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });
    const r = await confirmBooking('b1');
    expect(mockRpc).toHaveBeenCalledWith('confirm_booking', { p_booking_id: 'b1' });
    expect(mockApprovedEmail).toHaveBeenCalledWith(expect.anything(), 'b1');
    expect(r).toEqual({ ok: true });
  });

  it('confirmBooking es idempotente: no reenvía correo si la reserva ya estaba confirmada', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });
    const r = await confirmBooking('b1');
    expect(mockApprovedEmail).not.toHaveBeenCalled();
    expect(r).toEqual({ ok: true });
  });

  it('cancelBooking llama a la RPC con el motivo', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const r = await cancelBooking('b1', 'no puedo ir');
    expect(mockRpc).toHaveBeenCalledWith('cancel_booking', { p_booking_id: 'b1', p_reason: 'no puedo ir' });
    expect(r).toEqual({ ok: true });
  });

  it('al cancelar una reserva avisa por correo a la otra parte', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await cancelBooking('b1');
    expect(mockCancelEmails).toHaveBeenCalledWith(expect.anything(), ['b1'], 'u1');
  });

  it('no manda correos si la cancelación falla', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'NOT_ALLOWED' } });
    await cancelBooking('b1');
    expect(mockCancelEmails).not.toHaveBeenCalled();
  });

  it('exigen sesión iniciada (lanzan sin usuario)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(confirmBooking('b1')).rejects.toThrow('No autenticado');
    await expect(cancelBooking('b1')).rejects.toThrow('No autenticado');
    await expect(setBookingAttendance('b1', 'attended')).rejects.toThrow('No autenticado');
    await expect(cancelClassSession('s1')).rejects.toThrow('No autenticado');
    await expect(listClassSessions('c1')).rejects.toThrow('No autenticado');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('propagan los errores de permiso de la base', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'NOT_ALLOWED' } });
    expect(await confirmBooking('b1')).toMatchObject({ ok: false, error: { code: 'NOT_ALLOWED' } });
    expect(await cancelBooking('b1')).toMatchObject({ ok: false, error: { code: 'NOT_ALLOWED' } });
    expect(await setBookingAttendance('b1', 'no_show')).toMatchObject({ ok: false, error: { code: 'NOT_ALLOWED' } });
  });

  it('si falla createAdminClient al cancelar, la cancelación igual responde ok', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    mockAdmin.mockImplementationOnce(() => { throw new Error('missing key'); });
    const r = await cancelBooking('b1');
    expect(r).toEqual({ ok: true });
  });

  it('cancelClassSession devuelve cuántas reservas se cancelaron y avisa a los IDs atómicos', async () => {
    mockRpc.mockResolvedValue({ data: ['b1', 'b2', 'b3'], error: null });
    const r = await cancelClassSession('s1', 'lluvia');
    expect(mockRpc).toHaveBeenCalledWith('cancel_class_session', { p_session_id: 's1', p_reason: 'lluvia' });
    expect(mockCancelEmails).toHaveBeenCalledWith(expect.anything(), ['b1', 'b2', 'b3'], 'u1');
    expect(r).toEqual({ ok: true, data: { cancelled: 3 } });
  });
});
