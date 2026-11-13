'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeRevalidateTag } from '@/lib/cache';
import { bookingRateLimiter, checkRateLimit } from '@/lib/ratelimit';
import { enqueueEmail, buildBookingEmailPayload } from '@/lib/email/outbox';
import { dispatchOutbox } from '@/lib/email/send';
import { enqueueCancellationEmails } from '@/lib/email/cancellations';
import { BOOKING_EMAIL_SELECT } from '@/lib/email/reminders';
import { parseBookingError, BOOKING_ERROR_MESSAGES } from './errors';
import { fetchClassSessions } from './queries';
import type { BookingActionResult, ClassSession } from './types';

// Server Actions de reservas. Cada una exige sesión y delega la autorización real en la RPC
// (migración 70): la base de datos decide quién puede reservar, cancelar o marcar asistencia.

type Supabase = Awaited<ReturnType<typeof createClient>>;

const fail = (code: keyof typeof BOOKING_ERROR_MESSAGES) =>
  ({ ok: false as const, error: { code, message: BOOKING_ERROR_MESSAGES[code] } });

// Convención del repo: una Server Action sin sesión lanza, no devuelve un error "suave".
// La interfaz ya manda a iniciar sesión antes de mostrar cualquier botón de reservas.
async function requireUser(supabase: Supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  return user;
}

/** Envía lo pendiente de la cola DESPUÉS de responder (el usuario no espera al proveedor de correo). */
function dispatchAfterResponse(limit: number) {
  after(async () => {
    try { await dispatchOutbox(createAdminClient(), limit); } catch (err) { console.error('[dispatchAfterResponse]', err); }
  });
}

function revalidateBookings() {
  revalidatePath('/dashboard/alumno/reservas');
  revalidatePath('/dashboard/reservas');
  safeRevalidateTag('classes', 'max');
}

/**
 * Deja en la cola los correos de una reserva nueva: confirmación al alumno y aviso al profesor.
 * Es "mejor esfuerzo": si falla, la reserva ya está hecha y no se revierte.
 */
async function enqueueBookingEmails(bookingId: string, student: { id: string; email?: string | null }) {
  try {
    const admin = createAdminClient();
    const { data: row } = await admin
      .from('bookings')
      .select(BOOKING_EMAIL_SELECT)
      .eq('id', bookingId)
      .single();
    if (!row) return;

    const typed = row as unknown as Parameters<typeof buildBookingEmailPayload>[0] & {
      student_note?: string | null;
      class: { teacher_id: string | null; teacher?: { name: string | null } | null };
    };
    const teacherName = typed.class.teacher?.name ?? undefined;
    const payload = { ...buildBookingEmailPayload(typed), teacherName };
    const { data: profile } = await admin.from('profiles').select('name').eq('id', student.id).single();

    await enqueueEmail(admin, {
      to: student.email ?? '',
      template: 'booking_confirmed',
      payload,
      dedupeKey: `booking_confirmed:${bookingId}`,
    });

    if (typed.class.teacher_id) {
      const { data: teacher } = await admin.auth.admin.getUserById(typed.class.teacher_id);
      await enqueueEmail(admin, {
        to: teacher?.user?.email ?? '',
        template: 'booking_received',
        payload: { ...payload, studentName: (profile as { name?: string | null } | null)?.name ?? 'Un alumno', note: typed.student_note ?? undefined },
        dedupeKey: `booking_received:${bookingId}`,
      });
    }

    // Si el proveedor falla o no está configurado, el cron diario lo reintenta.
    dispatchAfterResponse(10);
  } catch (err) {
    console.error('[enqueueBookingEmails]', err);
  }
}

export async function reserveBooking(input: {
  classId: string;
  sessionId?: string | null;
  seats?: number;
  note?: string;
}): Promise<BookingActionResult<{ bookingId: string }>> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { success } = await checkRateLimit(bookingRateLimiter, user.id);
  if (!success) return fail('RATE_LIMITED');

  const { data, error } = await supabase.rpc('reserve_booking', {
    p_class_id: input.classId,
    p_session_id: input.sessionId ?? null,
    p_seats: input.seats ?? 1,
    p_note: input.note?.trim() || null,
  });
  if (error || !data) return { ok: false, error: parseBookingError(error) };

  const bookingId = data as string;
  await enqueueBookingEmails(bookingId, user);
  revalidateBookings();
  return { ok: true, data: { bookingId } };
}

export async function cancelBooking(bookingId: string, reason?: string): Promise<BookingActionResult> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { error } = await supabase.rpc('cancel_booking', { p_booking_id: bookingId, p_reason: reason ?? null });
  if (error) return { ok: false, error: parseBookingError(error) };

  await enqueueCancellationEmails(createAdminClient(), [bookingId], user.id);
  dispatchAfterResponse(25);
  revalidateBookings();
  return { ok: true };
}

export async function setBookingAttendance(
  bookingId: string,
  status: 'attended' | 'no_show',
): Promise<BookingActionResult> {
  const supabase = await createClient();
  await requireUser(supabase);

  const { error } = await supabase.rpc('set_booking_attendance', { p_booking_id: bookingId, p_status: status });
  if (error) return { ok: false, error: parseBookingError(error) };

  revalidateBookings();
  return { ok: true };
}

export async function cancelClassSession(
  sessionId: string,
  reason?: string,
): Promise<BookingActionResult<{ cancelled: number }>> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  // Las reservas activas de la fecha se leen antes de cancelar, para avisar solo a esas personas.
  let affected: string[] = [];
  try {
    const { data: active } = await createAdminClient().from('bookings').select('id').eq('session_id', sessionId).in('status', ['hold', 'pending_payment', 'confirmed']);
    affected = ((active ?? []) as { id: string }[]).map(b => b.id);
  } catch (err) {
    console.error('[cancelClassSession] reservas afectadas', err);
  }

  const { data, error } = await supabase.rpc('cancel_class_session', { p_session_id: sessionId, p_reason: reason ?? null });
  if (error) return { ok: false, error: parseBookingError(error) };

  await enqueueCancellationEmails(createAdminClient(), affected, user.id);
  dispatchAfterResponse(25);
  revalidateBookings();
  return { ok: true, data: { cancelled: Number(data ?? 0) } };
}

/** Fechas reservables de una clase (la ficha pública se cachea, así que se piden al abrir el selector). */
export async function listClassSessions(classId: string): Promise<ClassSession[]> {
  await requireUser(await createClient());
  return fetchClassSessions(classId);
}
