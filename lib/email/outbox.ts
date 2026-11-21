import type { SupabaseClient } from '@supabase/supabase-js';
import { pickInitialSchedule } from '@/lib/bookings/dates';
import { buildGoogleMapsUrl } from '@/lib/utils';

// Cola de correos transaccionales (tabla email_outbox, migración 70).
// El servidor deja aquí el correo pendiente; un enviador (Resend) lo despacha.
// La tabla solo es accesible con service role: pasa siempre un cliente admin.

export interface OutboxEmail {
  to: string;
  template: string;
  payload: Record<string, unknown>;
  /** Evita duplicar el mismo correo si el evento se repite (ej. `booking_confirmed:<id>`). */
  dedupeKey: string;
}

export async function enqueueEmail(admin: SupabaseClient, email: OutboxEmail): Promise<boolean> {
  const to = email.to?.trim();
  if (!to) return false;
  const { error } = await admin
    .from('email_outbox')
    .upsert(
      { to_email: to, template: email.template, payload: email.payload, dedupe_key: email.dedupeKey },
      { onConflict: 'dedupe_key', ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
  return true;
}

/** Borra de la cola los correos enviados hace más de `days` días (la tabla solo crece). Nunca lanza. */
export async function purgeSentEmails(admin: SupabaseClient, days = 60, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString();
  const { data, error } = await admin.from('email_outbox').delete().eq('status', 'sent').lt('sent_at', cutoff).select('id');
  if (error) {
    console.error('[purgeSentEmails]', error.message);
    return 0;
  }
  return data?.length ?? 0;
}

interface BookingEmailRow {
  id: string;
  seats: number;
  price_amount: number | string;
  currency: string;
  payment_method: string;
  status?: string | null;
  student_whatsapp?: string | null;
  student_instagram?: string | null;
  class: {
    id: string;
    title: string;
    slug: string | null;
    type: string;
    modality: string;
    start_date: string | null;
    end_date: string | null;
    cancellation_policy: string | null;
    contact_mode?: string | null;
    footwear: string[] | null;
    clothing: string | null;
    to_bring: string[] | null;
    venue: {
      name: string | null; address: string | null; reference: string | null;
      maps_url: string | null; place_id?: string | null; lat?: number | null; lng?: number | null;
      city: string | null;
    } | null;
    teacher?: {
      name?: string | null;
      whatsapp?: string | null;
      instagram?: string | null;
      show_whatsapp?: boolean | null;
    } | null;
    class_schedules?: { day_of_week: number; start_time: string; end_time: string }[] | null;
  };
  session: { session_date: string; start_time: string; end_time: string } | null;
}

const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : undefined);

/** Datos que necesita la plantilla del correo de una reserva (cuándo, dónde y qué llevar). */
export function buildBookingEmailPayload(row: BookingEmailRow) {
  const c = row.class;
  const fallbackSlot = row.session ? undefined : pickInitialSchedule(c.class_schedules, c.start_date);
  const isOnline = c.modality === 'Online';
  const mapsUrl = isOnline
    ? undefined
    : buildGoogleMapsUrl({
        placeId: c.venue?.place_id ?? undefined,
        lat: c.venue?.lat ?? undefined,
        lng: c.venue?.lng ?? undefined,
        address: c.venue?.address ?? undefined,
      }) ?? c.venue?.maps_url ?? undefined;

  return {
    bookingId: row.id,
    classId: c.id,
    classTitle: c.title,
    classSlug: c.slug ?? undefined,
    classType: c.type,
    modality: c.modality,
    seats: row.seats,
    price: Number(row.price_amount),
    currency: row.currency,
    paymentMethod: row.payment_method,
    date: row.session?.session_date ?? c.start_date ?? undefined,
    endDate: row.session ? undefined : c.end_date ?? undefined,
    startTime: hhmm(row.session?.start_time ?? fallbackSlot?.start_time),
    endTime: hhmm(row.session?.end_time ?? fallbackSlot?.end_time),
    venueName: isOnline ? undefined : c.venue?.name ?? undefined,
    address: isOnline ? undefined : c.venue?.address ?? undefined,
    reference: isOnline ? undefined : c.venue?.reference ?? undefined,
    mapsUrl,
    city: isOnline ? undefined : c.venue?.city ?? undefined,
    footwear: c.footwear ?? [],
    clothing: c.clothing ?? undefined,
    toBring: c.to_bring ?? [],
    cancellationPolicy: c.cancellation_policy ?? 'moderada',
    contactMode: c.contact_mode ?? 'whatsapp',
    ...(row.status ? { status: row.status } : {}),
    ...(c.teacher?.whatsapp?.trim() ? { teacherWhatsapp: c.teacher.whatsapp.trim() } : {}),
    ...(c.teacher?.instagram?.trim() ? { teacherInstagram: c.teacher.instagram.trim() } : {}),
    ...(c.teacher?.show_whatsapp != null ? { teacherShowWhatsapp: c.teacher.show_whatsapp } : {}),
  };
}
