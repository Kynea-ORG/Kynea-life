import type { SupabaseClient } from '@supabase/supabase-js';
import { limaToDate, pickInitialSchedule } from '@/lib/bookings/dates';
import { createBookingActionToken } from '@/lib/bookings/tokens';
import { buildBookingEmailPayload, enqueueEmail } from './outbox';
import { BOOKING_EMAIL_SELECT } from './reminders';

const VALID_REMINDER_HOURS = new Set([1, 2, 4, 12, 24, 48]);

/**
 * Encola el correo `booking_approved` al alumno cuando el profesor confirma su solicitud.
 * Mejor esfuerzo: nunca lanza.
 */
export async function enqueueBookingApprovedEmail(admin: SupabaseClient, bookingId: string): Promise<boolean> {
  try {
    const { data: row } = await admin
      .from('bookings')
      .select(BOOKING_EMAIL_SELECT)
      .eq('id', bookingId)
      .single();
    if (!row) return false;

    const typed = row as unknown as Parameters<typeof buildBookingEmailPayload>[0] & {
      user_id: string;
      class: { teacher?: { name: string | null } | null };
    };
    const { data: student } = await admin.auth.admin.getUserById(typed.user_id);
    const to = student?.user?.email ?? '';
    if (!to) return false;

    const payload = {
      ...buildBookingEmailPayload(typed),
      teacherName: typed.class.teacher?.name ?? undefined,
    };
    return await enqueueEmail(admin, {
      to,
      template: 'booking_approved',
      payload,
      dedupeKey: `booking_approved:${bookingId}`,
    });
  } catch (err) {
    console.error('[enqueueBookingApprovedEmail]', bookingId, err);
    return false;
  }
}

interface PendingBookingRow {
  id: string;
  user_id: string;
  class_id: string;
  session_id: string | null;
  seats: number;
  price_amount: number | string;
  currency: string;
  student_note: string | null;
  student_whatsapp: string | null;
  student_instagram: string | null;
  class: {
    id: string;
    title: string;
    modality: string;
    start_date: string | null;
    end_date: string | null;
    teacher_id: string | null;
    reminder_hours_before: number | null;
    class_schedules?: { day_of_week: number; start_time: string; end_time: string }[] | null;
  } | null;
  session: {
    id: string;
    session_date: string;
    start_time: string;
    end_time: string;
  } | null;
}

export interface PendingConfirmationsResult {
  expired: number;
  preReminders: number;
  postReminders: number;
}

/**
 * Procesa el ciclo horario de reservas `pending_confirmation`:
 * 1) Cierra silenciosamente (status = 'expired') las que superaron 48h post-clase.
 * 2) Envía 1 aviso agrupado al profesor cuando entra en `reminder_hours_before` (pre-clase).
 * 3) Envía 1 último aviso agrupado al profesor ~12h después de la clase (antes del cierre 48h).
 */
export async function processPendingConfirmations(
  admin: SupabaseClient,
  now = new Date(),
): Promise<PendingConfirmationsResult> {
  let expired = 0;
  const { data: expiredData, error: expireErr } = await admin.rpc('expire_unconfirmed_bookings', {
    p_grace_hours: 48,
  });
  if (expireErr) {
    console.error('[processPendingConfirmations] expire_unconfirmed_bookings:', expireErr.message);
  } else {
    expired = Number(expiredData ?? 0);
  }

  const { data, error } = await admin
    .from('bookings')
    .select(`
      id, user_id, class_id, session_id, seats, price_amount, currency,
      student_note, student_whatsapp, student_instagram,
      class:classes(id, title, modality, start_date, end_date, teacher_id, reminder_hours_before,
        class_schedules(day_of_week, start_time, end_time)),
      session:class_sessions(id, session_date, start_time, end_time)
    `)
    .eq('status', 'pending_confirmation');

  if (error) {
    console.error('[processPendingConfirmations] fetch pending:', error.message);
    return { expired, preReminders: 0, postReminders: 0 };
  }

  const rows = (data ?? []) as unknown as PendingBookingRow[];
  if (rows.length === 0) return { expired, preReminders: 0, postReminders: 0 };

  // Agrupa por sesión (modo session) o por clase (modo class).
  const groups = new Map<string, PendingBookingRow[]>();
  for (const r of rows) {
    if (!r.class?.teacher_id) continue;
    const key = r.session_id ? `session:${r.session_id}` : `class:${r.class_id}`;
    const list = groups.get(key);
    if (list) list.push(r);
    else groups.set(key, [r]);
  }

  type DueGroup = {
    groupKey: string;
    kind: 'pre_class' | 'post_class';
    dedupeKey: string;
    teacherId: string;
    classTitle: string;
    modality: string;
    date: string;
    startTime?: string;
    endTime?: string;
    reminderHoursBefore: number;
    bookings: PendingBookingRow[];
  };

  const dueGroups: DueGroup[] = [];
  const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : undefined);

  for (const [groupKey, list] of groups.entries()) {
    const sample = list[0];
    const cls = sample.class!;
    const fallbackSlot = sample.session ? undefined : pickInitialSchedule(cls.class_schedules, cls.start_date);
    const date = sample.session?.session_date ?? cls.start_date;
    if (!date) continue;

    const startTime = hhmm(sample.session?.start_time ?? fallbackSlot?.start_time);
    const endTime = hhmm(sample.session?.end_time ?? fallbackSlot?.end_time);
    const startMs = limaToDate(date, startTime ?? '00:00').getTime();
    const endDate = sample.session ? date : (cls.end_date ?? date);
    const endMs = endTime
      ? limaToDate(endDate, endTime).getTime()
      : startMs + 3_600_000;

    const rawReminder = Number(cls.reminder_hours_before ?? 24);
    const reminderHoursBefore = VALID_REMINDER_HOURS.has(rawReminder) ? rawReminder : 24;

    const hoursUntilStart = (startMs - now.getTime()) / 3_600_000;
    const hoursSinceEnd = (now.getTime() - endMs) / 3_600_000;

    if (hoursUntilStart > 0 && hoursUntilStart <= reminderHoursBefore) {
      dueGroups.push({
        groupKey,
        kind: 'pre_class',
        dedupeKey: `teacher_pending_pre:${groupKey}:${reminderHoursBefore}h`,
        teacherId: cls.teacher_id!,
        classTitle: cls.title,
        modality: cls.modality,
        date,
        startTime,
        endTime,
        reminderHoursBefore,
        bookings: list,
      });
    } else if (hoursSinceEnd >= 12 && hoursSinceEnd < 48) {
      dueGroups.push({
        groupKey,
        kind: 'post_class',
        dedupeKey: `teacher_pending_post12h:${groupKey}`,
        teacherId: cls.teacher_id!,
        classTitle: cls.title,
        modality: cls.modality,
        date,
        startTime,
        endTime,
        reminderHoursBefore,
        bookings: list,
      });
    }
  }

  if (dueGroups.length === 0) return { expired, preReminders: 0, postReminders: 0 };

  // Evita emitir tokens huérfanos para recordatorios ya encolados en corridas previas.
  const dedupeKeys = dueGroups.map(g => g.dedupeKey);
  const { data: existingOutbox } = await admin
    .from('email_outbox')
    .select('dedupe_key')
    .in('dedupe_key', dedupeKeys);
  const alreadyQueued = new Set(
    ((existingOutbox ?? []) as { dedupe_key: string | null }[])
      .map(r => r.dedupe_key)
      .filter((k): k is string => Boolean(k)),
  );

  const toSend = dueGroups.filter(g => !alreadyQueued.has(g.dedupeKey));
  if (toSend.length === 0) return { expired, preReminders: 0, postReminders: 0 };

  // Resuelve perfiles de alumnos y correos de profesores en lotes.
  const studentIds = [...new Set(toSend.flatMap(g => g.bookings.map(b => b.user_id)))];
  const studentProfiles = new Map<string, { name?: string | null; whatsapp?: string | null; instagram?: string | null }>();
  if (studentIds.length > 0) {
    const { data: profilesData } = await admin
      .from('profiles')
      .select('id, name, whatsapp, instagram')
      .in('id', studentIds);
    for (const p of (profilesData ?? []) as { id: string; name: string | null; whatsapp: string | null; instagram: string | null }[]) {
      studentProfiles.set(p.id, p);
    }
  }

  const teacherEmails = new Map<string, string>();
  const teacherIds = [...new Set(toSend.map(g => g.teacherId))];
  for (const tid of teacherIds) {
    try {
      const { data: u } = await admin.auth.admin.getUserById(tid);
      teacherEmails.set(tid, u?.user?.email ?? '');
    } catch (err) {
      console.error('[processPendingConfirmations] getUserById', tid, err);
      teacherEmails.set(tid, '');
    }
  }

  let preReminders = 0;
  let postReminders = 0;

  for (const g of toSend) {
    const to = teacherEmails.get(g.teacherId) ?? '';
    if (!to) continue;

    try {
      const items = await Promise.all(g.bookings.map(async b => {
        const sp = studentProfiles.get(b.user_id);
        const token = await createBookingActionToken(admin, {
          bookingId: b.id,
          teacherId: g.teacherId,
          date: g.date,
          startTime: g.startTime,
          now,
        });
        return {
          bookingId: b.id,
          studentName: sp?.name?.trim() || 'Alumno',
          seats: b.seats,
          price: Number(b.price_amount),
          currency: b.currency,
          note: b.student_note?.trim() || undefined,
          studentWhatsapp: b.student_whatsapp?.trim() || sp?.whatsapp?.trim() || undefined,
          studentInstagram: b.student_instagram?.trim() || sp?.instagram?.trim() || undefined,
          actionToken: token ?? undefined,
        };
      }));

      const ok = await enqueueEmail(admin, {
        to,
        template: 'teacher_pending_reminder',
        payload: {
          kind: g.kind,
          classTitle: g.classTitle,
          modality: g.modality,
          date: g.date,
          startTime: g.startTime,
          endTime: g.endTime,
          reminderHoursBefore: g.reminderHoursBefore,
          items,
        },
        dedupeKey: g.dedupeKey,
      });

      if (ok) {
        if (g.kind === 'pre_class') preReminders += 1;
        else postReminders += 1;
      }
    } catch (err) {
      console.error('[processPendingConfirmations] group', g.groupKey, err);
    }
  }

  return { expired, preReminders, postReminders };
}
