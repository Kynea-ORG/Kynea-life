import { createHash, randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { pickInitialSchedule, limaToDate } from './dates';
import type { BookingStatus } from './types';

export const TEACHER_RELEASE_REASON = 'Cupo liberado por el profesor (sin confirmación)';

export function hashActionToken(rawToken: string): string {
  return createHash('sha256').update(rawToken.trim()).digest('hex');
}

/** Calcula una expiración segura para un token 1-tap (mínimo 72h, o 54h después de la clase). */
export function computeTokenExpiry(opts: {
  date?: string | null;
  startTime?: string | null;
  now?: Date;
}): Date {
  const now = opts.now ?? new Date();
  const minExpiry = now.getTime() + 72 * 3_600_000;
  if (opts.date) {
    const startMs = limaToDate(opts.date, opts.startTime ?? '23:59').getTime();
    const afterClass = startMs + 54 * 3_600_000;
    return new Date(Math.max(minExpiry, afterClass));
  }
  return new Date(now.getTime() + 14 * 86_400_000);
}

/** Crea un token opaco de acción 1-tap, persiste solo su hash SHA-256 y devuelve el token crudo. */
export async function createBookingActionToken(
  admin: SupabaseClient,
  opts: { bookingId: string; teacherId: string; date?: string | null; startTime?: string | null; now?: Date },
): Promise<string | null> {
  try {
    const raw = randomBytes(32).toString('base64url');
    const tokenHash = hashActionToken(raw);
    const expiresAt = computeTokenExpiry({ date: opts.date, startTime: opts.startTime, now: opts.now });
    const { error } = await admin.from('booking_action_tokens').insert({
      token_hash: tokenHash,
      booking_id: opts.bookingId,
      teacher_id: opts.teacherId,
      expires_at: expiresAt.toISOString(),
    });
    if (error) {
      console.error('[createBookingActionToken]', error.message);
      return null;
    }
    return raw;
  } catch (err) {
    console.error('[createBookingActionToken]', err);
    return null;
  }
}

export interface ActionTokenBookingView {
  bookingId: string;
  teacherId: string;
  status: BookingStatus;
  seats: number;
  priceAmount: number;
  currency: string;
  classTitle: string;
  modality: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  studentName: string;
  studentWhatsapp?: string;
  studentInstagram?: string;
  studentNote?: string;
}

export type LoadActionTokenResult =
  | { ok: true; used: boolean; booking: ActionTokenBookingView }
  | { ok: false; reason: 'missing' | 'invalid' | 'expired' };

/**
 * Inspecciona un token sin mutar nada en DB (protección contra link-scanners de Gmail/Outlook).
 */
export async function loadBookingActionByToken(
  admin: SupabaseClient,
  rawToken: string | null | undefined,
  now = new Date(),
): Promise<LoadActionTokenResult> {
  const clean = rawToken?.trim();
  if (!clean || clean.length < 16) return { ok: false, reason: 'missing' };

  const tokenHash = hashActionToken(clean);
  const { data: tok, error: tokErr } = await admin
    .from('booking_action_tokens')
    .select('booking_id, teacher_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .single();

  if (tokErr || !tok) return { ok: false, reason: 'invalid' };
  const typedTok = tok as { booking_id: string; teacher_id: string; expires_at: string; used_at: string | null };

  if (Date.parse(typedTok.expires_at) <= now.getTime()) {
    return { ok: false, reason: 'expired' };
  }

  const { data: row, error: bookingErr } = await admin
    .from('bookings')
    .select(`
      id, user_id, status, seats, price_amount, currency, student_note, student_whatsapp, student_instagram,
      class:classes(id, title, modality, start_date, teacher_id, class_schedules(day_of_week, start_time, end_time)),
      session:class_sessions(session_date, start_time, end_time)
    `)
    .eq('id', typedTok.booking_id)
    .single();

  if (bookingErr || !row) return { ok: false, reason: 'invalid' };

  type BookingQueryRow = {
    id: string;
    user_id: string;
    status: string;
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
      teacher_id: string | null;
      class_schedules?: { day_of_week: number; start_time: string; end_time: string }[] | null;
    } | null;
    session: { session_date: string; start_time: string; end_time: string } | null;
  };

  const b = row as unknown as BookingQueryRow;
  if (!b.class || b.class.teacher_id !== typedTok.teacher_id) {
    return { ok: false, reason: 'invalid' };
  }

  const { data: studentProfile } = await admin
    .from('profiles')
    .select('name, whatsapp, instagram')
    .eq('id', b.user_id)
    .single();
  const sp = studentProfile as { name?: string | null; whatsapp?: string | null; instagram?: string | null } | null;

  const fallback = b.session ? undefined : pickInitialSchedule(b.class.class_schedules, b.class.start_date);
  const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : undefined);

  return {
    ok: true,
    used: Boolean(typedTok.used_at),
    booking: {
      bookingId: b.id,
      teacherId: typedTok.teacher_id,
      status: b.status as BookingStatus,
      seats: b.seats,
      priceAmount: Number(b.price_amount),
      currency: b.currency,
      classTitle: b.class.title,
      modality: b.class.modality,
      date: b.session?.session_date ?? b.class.start_date ?? undefined,
      startTime: hhmm(b.session?.start_time ?? fallback?.start_time),
      endTime: hhmm(b.session?.end_time ?? fallback?.end_time),
      studentName: sp?.name?.trim() || 'Alumno',
      studentWhatsapp: b.student_whatsapp?.trim() || sp?.whatsapp?.trim() || undefined,
      studentInstagram: b.student_instagram?.trim() || sp?.instagram?.trim() || undefined,
      studentNote: b.student_note?.trim() || undefined,
    },
  };
}

export type ExecuteActionTokenResult =
  | { ok: true; outcome: 'confirmed' | 'released' | 'already_resolved'; currentStatus: BookingStatus; bookingId: string; teacherId: string }
  | { ok: false; reason: 'invalid' | 'expired' };

/**
 * Consume atómicamente el token y aplica la decisión del profesor (`confirm` o `release`).
 * Debe invocarse únicamente desde un POST (Server Action / Route Handler).
 */
export async function executeBookingActionByToken(
  admin: SupabaseClient,
  rawToken: string,
  decision: 'confirm' | 'release',
  now = new Date(),
): Promise<ExecuteActionTokenResult> {
  const loaded = await loadBookingActionByToken(admin, rawToken, now);
  if (!loaded.ok) {
    return { ok: false, reason: loaded.reason === 'expired' ? 'expired' : 'invalid' };
  }

  const { bookingId, teacherId, status } = loaded.booking;

  // Idempotente si la reserva ya salió de pending_confirmation o el token ya fue usado.
  if (loaded.used || status !== 'pending_confirmation') {
    return { ok: true, outcome: 'already_resolved', currentStatus: status, bookingId, teacherId };
  }

  const tokenHash = hashActionToken(rawToken);
  const { data: claimed, error: claimErr } = await admin
    .from('booking_action_tokens')
    .update({ used_at: now.toISOString() })
    .eq('token_hash', tokenHash)
    .is('used_at', null)
    .gt('expires_at', now.toISOString())
    .select('booking_id')
    .maybeSingle();

  if (claimErr || !claimed) {
    const refreshed = await loadBookingActionByToken(admin, rawToken, now);
    if (refreshed.ok) {
      return { ok: true, outcome: 'already_resolved', currentStatus: refreshed.booking.status, bookingId, teacherId };
    }
    return { ok: false, reason: 'invalid' };
  }

  if (decision === 'confirm') {
    const { data: updated, error: updErr } = await admin
      .from('bookings')
      .update({
        status: 'confirmed',
        confirmed_at: now.toISOString(),
        confirmed_by: teacherId,
      })
      .eq('id', bookingId)
      .eq('status', 'pending_confirmation')
      .select('status')
      .maybeSingle();

    if (updErr || !updated) {
      const refreshed = await loadBookingActionByToken(admin, rawToken, now);
      return {
        ok: true,
        outcome: 'already_resolved',
        currentStatus: refreshed.ok ? refreshed.booking.status : status,
        bookingId,
        teacherId,
      };
    }

    return { ok: true, outcome: 'confirmed', currentStatus: 'confirmed', bookingId, teacherId };
  }

  const { data: updated, error: updErr } = await admin
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: now.toISOString(),
      cancelled_by: teacherId,
      cancel_reason: TEACHER_RELEASE_REASON,
    })
    .eq('id', bookingId)
    .eq('status', 'pending_confirmation')
    .select('status')
    .maybeSingle();

  if (updErr || !updated) {
    const refreshed = await loadBookingActionByToken(admin, rawToken, now);
    return {
      ok: true,
      outcome: 'already_resolved',
      currentStatus: refreshed.ok ? refreshed.booking.status : status,
      bookingId,
      teacherId,
    };
  }

  return { ok: true, outcome: 'released', currentStatus: 'cancelled', bookingId, teacherId };
}
