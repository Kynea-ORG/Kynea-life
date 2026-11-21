import type { SupabaseClient } from '@supabase/supabase-js';
import { addDays, daysUntil } from '@/lib/bookings/dates';
import { buildBookingEmailPayload, enqueueEmail } from './outbox';

// Recordatorios "mañana tienes clase" y "hoy es tu clase": se ejecutan una vez al día (cron) y
// dejan en la cola un correo por cada reserva confirmada cuya fecha es mañana u hoy. La clave
// (reserva + fecha + días) evita duplicados si el cron corre dos veces.

export const BOOKING_EMAIL_SELECT = `
  id, user_id, seats, price_amount, currency, payment_method, status, student_note, student_whatsapp, student_instagram, cancel_reason,
  class:classes(id, title, slug, type, modality, start_date, end_date, cancellation_policy, contact_mode, reminder_hours_before,
    footwear, clothing, to_bring, teacher_id,
    venue:venues(name, address, reference, maps_url, place_id, lat, lng, city),
    teacher:profiles!teacher_id(name, whatsapp, instagram, show_whatsapp),
    class_schedules(day_of_week, start_time, end_time)),
  session:class_sessions(session_date, start_time, end_time)
`;

type ReminderRow = Parameters<typeof buildBookingEmailPayload>[0] & {
  user_id: string;
  class: { teacher?: { name: string | null } | null };
};

/** Reservas confirmadas cuya clase empieza hoy o mañana (filtradas en la base, no en memoria). */
async function fetchReminderCandidates(admin: SupabaseClient, dates: string[]): Promise<ReminderRow[]> {
  const bySession = admin
    .from('bookings')
    .select(BOOKING_EMAIL_SELECT.replace('session:class_sessions(', 'session:class_sessions!inner('))
    .eq('status', 'confirmed')
    .in('session.session_date', dates);
  const byClass = admin
    .from('bookings')
    .select(BOOKING_EMAIL_SELECT.replace('class:classes(', 'class:classes!inner('))
    .eq('status', 'confirmed')
    .is('session_id', null)
    .in('class.start_date', dates);
  const [a, b] = await Promise.all([bySession, byClass]);
  if (a.error) throw new Error(a.error.message);
  if (b.error) throw new Error(b.error.message);
  const byId = new Map<string, ReminderRow>();
  for (const row of [...(a.data ?? []), ...(b.data ?? [])] as unknown as ReminderRow[]) byId.set(row.id, row);
  return [...byId.values()];
}

export async function enqueueBookingReminders(admin: SupabaseClient, today: string): Promise<number> {
  let rows: ReminderRow[];
  try {
    rows = await fetchReminderCandidates(admin, [today, addDays(today, 1)]);
  } catch (err) {
    console.error('[enqueueBookingReminders]', err);
    return 0;
  }

  const due = rows
    .map(row => {
      const payload = buildBookingEmailPayload(row);
      return { row, payload, days: payload.date ? daysUntil(payload.date, today) : -1 };
    })
    .filter(r => r.days === 0 || r.days === 1);

  // Un correo por alumno, consultado en lotes acotados para no saturar Supabase Auth Admin.
  const userIds = [...new Set(due.map(r => r.row.user_id))];
  const emails = new Map<string, string>();
  const BATCH_SIZE = 10;
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const chunk = userIds.slice(i, i + BATCH_SIZE);
    const resolved = await Promise.all(chunk.map(async id => {
      try {
        const { data } = await admin.auth.admin.getUserById(id);
        return [id, data?.user?.email ?? ''] as const;
      } catch (err) {
        console.error('[enqueueBookingReminders] getUserById', id, err);
        return [id, ''] as const;
      }
    }));
    for (const [id, email] of resolved) emails.set(id, email);
  }

  let queued = 0;
  for (const { row, payload, days } of due) {
    try {
      const enqueued = await enqueueEmail(admin, {
        to: emails.get(row.user_id) ?? '',
        template: 'booking_reminder',
        payload: { ...payload, daysAway: days, teacherName: row.class.teacher?.name ?? undefined },
        dedupeKey: `booking_reminder:${row.id}:${payload.date}:${days}`,
      });
      if (enqueued) queued += 1;
    } catch (err) {
      console.error('[enqueueBookingReminders] enqueueEmail', row.id, err);
    }
  }
  return queued;
}
