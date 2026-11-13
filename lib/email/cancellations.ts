import type { SupabaseClient } from '@supabase/supabase-js';
import { buildBookingEmailPayload, enqueueEmail } from './outbox';
import { BOOKING_EMAIL_SELECT } from './reminders';

type CancelledRow = Parameters<typeof buildBookingEmailPayload>[0] & {
  user_id: string;
  cancel_reason: string | null;
  class: { teacher_id: string | null; teacher?: { name: string | null } | null };
};

/**
 * Avisa por correo de reservas ya canceladas. Si canceló el propio alumno, se avisa al profesor;
 * si canceló el profesor (o se canceló la fecha), se avisa al alumno. Mejor esfuerzo: nunca lanza.
 */
export async function enqueueCancellationEmails(admin: SupabaseClient, bookingIds: string[], actorId: string): Promise<void> {
  if (bookingIds.length === 0) return;
  try {
    for (const id of bookingIds) {
      const { data } = await admin.from('bookings').select(BOOKING_EMAIL_SELECT).eq('id', id).single();
      if (!data) continue;
      const row = data as unknown as CancelledRow;
      const payload = { ...buildBookingEmailPayload(row), teacherName: row.class.teacher?.name ?? undefined, reason: row.cancel_reason ?? undefined };

      if (actorId === row.user_id) {
        if (!row.class.teacher_id) continue;
        const [{ data: teacher }, { data: profile }] = await Promise.all([
          admin.auth.admin.getUserById(row.class.teacher_id),
          admin.from('profiles').select('name').eq('id', row.user_id).single(),
        ]);
        await enqueueEmail(admin, {
          to: teacher?.user?.email ?? '',
          template: 'booking_cancelled_by_student',
          payload: { ...payload, studentName: (profile as { name?: string | null } | null)?.name ?? 'Un alumno' },
          dedupeKey: `booking_cancelled_teacher:${id}`,
        });
      } else {
        const { data: student } = await admin.auth.admin.getUserById(row.user_id);
        await enqueueEmail(admin, {
          to: student?.user?.email ?? '',
          template: 'booking_cancelled',
          payload,
          dedupeKey: `booking_cancelled:${id}`,
        });
      }
    }
  } catch (err) {
    console.error('[enqueueCancellationEmails]', err);
  }
}
