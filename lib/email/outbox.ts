import type { SupabaseClient } from '@supabase/supabase-js';

// Cola de correos transaccionales (tabla email_outbox, migración 70).
// El servidor deja aquí el correo pendiente; un enviador (proveedor aún por elegir) lo despacha.
// La tabla solo es accesible con service role: pasa siempre un cliente admin.

export interface OutboxEmail {
  to: string;
  template: string;
  payload: Record<string, unknown>;
  /** Evita duplicar el mismo correo si el evento se repite (ej. `booking_confirmed:<id>`). */
  dedupeKey: string;
}

export async function enqueueEmail(admin: SupabaseClient, email: OutboxEmail): Promise<void> {
  const to = email.to?.trim();
  if (!to) return;
  const { error } = await admin
    .from('email_outbox')
    .upsert(
      { to_email: to, template: email.template, payload: email.payload, dedupe_key: email.dedupeKey },
      { onConflict: 'dedupe_key', ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
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
  class: {
    id: string;
    title: string;
    slug: string | null;
    type: string;
    modality: string;
    start_date: string | null;
    end_date: string | null;
    cancellation_policy: string | null;
    footwear: string[] | null;
    clothing: string | null;
    to_bring: string[] | null;
    venue: { name: string | null; address: string | null; reference: string | null; maps_url: string | null; city: string | null } | null;
  };
  session: { session_date: string; start_time: string; end_time: string } | null;
}

const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : undefined);

/** Datos que necesita la plantilla del correo de una reserva (cuándo, dónde y qué llevar). */
export function buildBookingEmailPayload(row: BookingEmailRow) {
  const c = row.class;
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
    startTime: hhmm(row.session?.start_time),
    endTime: hhmm(row.session?.end_time),
    venueName: c.venue?.name ?? undefined,
    address: c.venue?.address ?? undefined,
    reference: c.venue?.reference ?? undefined,
    mapsUrl: c.venue?.maps_url ?? undefined,
    city: c.venue?.city ?? undefined,
    footwear: c.footwear ?? [],
    clothing: c.clothing ?? undefined,
    toBring: c.to_bring ?? [],
    cancellationPolicy: c.cancellation_policy ?? 'moderada',
  };
}
