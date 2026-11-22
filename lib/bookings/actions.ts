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
import { enqueueBookingApprovedEmail } from '@/lib/email/confirmations';
import { BOOKING_EMAIL_SELECT } from '@/lib/email/reminders';
import { extractSocialHandle } from '@/lib/utils';
import { parseBookingError, BOOKING_ERROR_MESSAGES } from './errors';
import { fetchClassSessions } from './queries';
import { createBookingActionToken } from './tokens';
import type { BookingActionResult, BookingStatus, ClassSession } from './types';

// Server Actions de reservas. Cada una exige sesión y delega la autorización real en la RPC
// (migraciones 70–76): la base de datos decide quién puede reservar, confirmar, cancelar o marcar asistencia.

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
  revalidatePath('/dashboard/mis-reservas');
  revalidatePath('/dashboard/alumno/reservas');
  revalidatePath('/dashboard/reservas');
  revalidatePath('/dashboard/admin/resumen');
  safeRevalidateTag('classes', 'max');
}

/**
 * Deja en la cola los correos de una o varias reservas nuevas:
 * - Al alumno: `booking_pending` (si nació pendiente de confirmación) o `booking_confirmed` (si es gratuita).
 * - Al profesor: `booking_received` con contacto del alumno y botón 1-tap si requiere confirmación.
 * Es "mejor esfuerzo" con aislamiento por reserva: si falla, las reservas ya están hechas y no se revierten.
 */
async function enqueueBookingEmails(
  bookingIds: string[],
  student: { id: string; email?: string | null },
): Promise<BookingStatus | undefined> {
  if (bookingIds.length === 0) return undefined;
  let detectedStatus: BookingStatus | undefined;
  try {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('name, whatsapp, instagram')
      .eq('id', student.id)
      .single();
    const prof = profile as { name?: string | null; whatsapp?: string | null; instagram?: string | null } | null;
    const studentName = prof?.name ?? 'Un alumno';
    const teacherEmailCache = new Map<string, string>();

    for (const bookingId of bookingIds) {
      try {
        const { data: row } = await admin
          .from('bookings')
          .select(BOOKING_EMAIL_SELECT)
          .eq('id', bookingId)
          .single();
        if (!row) continue;

        const typed = row as unknown as Parameters<typeof buildBookingEmailPayload>[0] & {
          status?: string | null;
          student_note?: string | null;
          student_whatsapp?: string | null;
          student_instagram?: string | null;
          class: { teacher_id: string | null; teacher?: { name: string | null } | null };
        };
        const isPending = typed.status === 'pending_confirmation';
        if (!detectedStatus) {
          detectedStatus = isPending ? 'pending_confirmation' : 'confirmed';
        }
        const teacherName = typed.class.teacher?.name ?? undefined;
        const payload = { ...buildBookingEmailPayload(typed), teacherName };

        await enqueueEmail(admin, {
          to: student.email ?? '',
          template: isPending ? 'booking_pending' : 'booking_confirmed',
          payload,
          dedupeKey: `${isPending ? 'booking_pending' : 'booking_confirmed'}:${bookingId}`,
        });

        if (typed.class.teacher_id) {
          let teacherEmail = teacherEmailCache.get(typed.class.teacher_id);
          if (teacherEmail === undefined) {
            const { data: teacher } = await admin.auth.admin.getUserById(typed.class.teacher_id);
            teacherEmail = teacher?.user?.email ?? '';
            teacherEmailCache.set(typed.class.teacher_id, teacherEmail);
          }

          const actionToken = isPending
            ? await createBookingActionToken(admin, {
                bookingId,
                teacherId: typed.class.teacher_id,
                date: payload.date,
                startTime: payload.startTime,
              })
            : null;

          const studentWhatsapp = typed.student_whatsapp?.trim() || prof?.whatsapp?.trim() || undefined;
          const studentInstagram = typed.student_instagram?.trim() || prof?.instagram?.trim() || undefined;

          await enqueueEmail(admin, {
            to: teacherEmail,
            template: 'booking_received',
            payload: {
              ...payload,
              studentName,
              note: typed.student_note ?? undefined,
              ...(studentWhatsapp ? { studentWhatsapp } : {}),
              ...(studentInstagram ? { studentInstagram } : {}),
              ...(actionToken ? { actionToken } : {}),
            },
            dedupeKey: `booking_received:${bookingId}`,
          });
        }
      } catch (err) {
        console.error('[enqueueBookingEmails]', bookingId, err);
      }
    }

    // Si el proveedor falla o no está configurado, el cron diario/horario lo reintenta.
    dispatchAfterResponse(Math.max(10, bookingIds.length * 2));
  } catch (err) {
    console.error('[enqueueBookingEmails]', err);
  }
  return detectedStatus;
}

export async function reserveBooking(input: {
  classId: string;
  sessionId?: string | null;
  sessionIds?: string[];
  seats?: number;
  note?: string;
  whatsapp?: string;
  instagram?: string;
  saveContact?: boolean;
}): Promise<BookingActionResult<{ bookingId: string; bookingIds?: string[]; status?: BookingStatus }>> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { success } = await checkRateLimit(bookingRateLimiter, user.id);
  if (!success) return fail('RATE_LIMITED');

  const cleanNote = input.note?.trim() || null;
  const cleanWhatsapp = input.whatsapp?.trim() || null;
  const cleanInstagram = input.instagram?.trim() ? extractSocialHandle(input.instagram, 'instagram') || null : null;
  const seats = input.seats ?? 1;

  if (input.sessionIds && input.sessionIds.length > 0) {
    const { data, error } = await supabase.rpc('reserve_bookings', {
      p_class_id: input.classId,
      p_session_ids: input.sessionIds,
      p_seats: seats,
      p_note: cleanNote,
      p_whatsapp: cleanWhatsapp,
      p_instagram: cleanInstagram,
      p_save_contact: input.saveContact ?? true,
    });
    const bookingIds = Array.isArray(data) ? (data as string[]) : [];
    if (error || bookingIds.length === 0) return { ok: false, error: parseBookingError(error) };

    const status = await enqueueBookingEmails(bookingIds, user);
    revalidateBookings();
    return { ok: true, data: { bookingId: bookingIds[0], bookingIds, ...(status ? { status } : {}) } };
  }

  const { data, error } = await supabase.rpc('reserve_booking', {
    p_class_id: input.classId,
    p_session_id: input.sessionId ?? null,
    p_seats: seats,
    p_note: cleanNote,
    p_whatsapp: cleanWhatsapp,
    p_instagram: cleanInstagram,
    p_save_contact: input.saveContact ?? true,
  });
  if (error || !data) return { ok: false, error: parseBookingError(error) };

  const bookingId = data as string;
  const status = await enqueueBookingEmails([bookingId], user);
  revalidateBookings();
  return { ok: true, data: { bookingId, ...(status ? { status } : {}) } };
}

export async function confirmBooking(bookingId: string): Promise<BookingActionResult> {
  const supabase = await createClient();
  await requireUser(supabase);

  const { data, error } = await supabase.rpc('confirm_booking', { p_booking_id: bookingId });
  if (error) return { ok: false, error: parseBookingError(error) };

  // Solo encola correo de aprobación si realmente transicionó desde pending_confirmation.
  if (data === true) {
    try {
      await enqueueBookingApprovedEmail(createAdminClient(), bookingId);
      dispatchAfterResponse(10);
    } catch (err) {
      console.error('[confirmBooking] correo de aprobación', err);
    }
  }
  revalidateBookings();
  return { ok: true };
}

export async function cancelBooking(bookingId: string, reason?: string): Promise<BookingActionResult> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { error } = await supabase.rpc('cancel_booking', { p_booking_id: bookingId, p_reason: reason ?? null });
  if (error) return { ok: false, error: parseBookingError(error) };

  try {
    await enqueueCancellationEmails(createAdminClient(), [bookingId], user.id);
    dispatchAfterResponse(25);
  } catch (err) {
    console.error('[cancelBooking] correos de cancelación', err);
  }
  revalidateBookings();
  return { ok: true };
}

export async function setBookingAttendance(
  bookingId: string,
  status: 'confirmed' | 'attended' | 'no_show',
): Promise<BookingActionResult> {
  const supabase = await createClient();
  await requireUser(supabase);

  const { error } = await supabase.rpc('set_booking_attendance', { p_booking_id: bookingId, p_status: status });
  if (error) return { ok: false, error: parseBookingError(error) };

  revalidateBookings();
  return { ok: true };
}

export async function bulkSetBookingAttendance(
  bookingIds: string[],
  status: 'attended' | 'no_show',
): Promise<BookingActionResult<{ updated: number }>> {
  const supabase = await createClient();
  await requireUser(supabase);

  const uniqueIds = [...new Set(bookingIds.map(id => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { ok: true, data: { updated: 0 } };
  }

  const { data, error } = await supabase.rpc('bulk_set_booking_attendance', {
    p_booking_ids: uniqueIds,
    p_status: status,
  });
  if (error) return { ok: false, error: parseBookingError(error) };

  revalidatePath('/dashboard/reservas');
  return { ok: true, data: { updated: Number(data ?? uniqueIds.length) } };
}

export async function closeClassAttendance(
  classId: string,
  sessionId?: string | null,
): Promise<BookingActionResult<{ closed: number }>> {
  const supabase = await createClient();
  await requireUser(supabase);

  const { data, error } = await supabase.rpc('close_class_attendance', {
    p_class_id: classId,
    p_session_id: sessionId ?? null,
  });
  if (error) return { ok: false, error: parseBookingError(error) };

  revalidateBookings();
  return { ok: true, data: { closed: Number(data ?? 0) } };
}

export async function cancelClassSession(
  sessionId: string,
  reason?: string,
): Promise<BookingActionResult<{ cancelled: number }>> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  // La RPC cancela atómicamente y devuelve los booking_id efectivamente cancelados (migración 74).
  const { data, error } = await supabase.rpc('cancel_class_session', { p_session_id: sessionId, p_reason: reason ?? null });
  if (error) return { ok: false, error: parseBookingError(error) };

  const affected = Array.isArray(data) ? (data as string[]) : [];
  if (affected.length > 0) {
    try {
      await enqueueCancellationEmails(createAdminClient(), affected, user.id);
      dispatchAfterResponse(Math.max(25, affected.length));
    } catch (err) {
      console.error('[cancelClassSession] correos de cancelación', err);
    }
  }
  revalidateBookings();
  return { ok: true, data: { cancelled: affected.length } };
}

/** Fechas reservables de una clase (la ficha pública se cachea, así que se piden al abrir el selector). */
export async function listClassSessions(classId: string): Promise<ClassSession[]> {
  await requireUser(await createClient());
  return fetchClassSessions(classId);
}
