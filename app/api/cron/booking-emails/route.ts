import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTodayLima } from '@/lib/classes/helpers';
import { purgeSentEmails } from '@/lib/email/outbox';
import { enqueueBookingReminders } from '@/lib/email/reminders';
import { dispatchOutbox } from '@/lib/email/send';

export const dynamic = 'force-dynamic';
// Hasta 100 correos seguidos (~0,3 s cada uno): se pide margen explícito para que Vercel no lo corte.
export const maxDuration = 60;

// Cron diario: renueva las fechas reservables, encola los recordatorios de "mañana tienes clase" y reintenta los correos que
// quedaron pendientes en la cola. Protegido con CRON_SECRET, igual que daily-suggestions.
export async function GET(request: NextRequest) {
  // Esta ruta escribe con la service role y envía correos: sin CRON_SECRET no se ejecuta.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const admin = createAdminClient();
    // Mantiene ~90 días de fechas por delante en las clases "por fecha" (migración 72).
    const { data: newSessions, error: sessionsError } = await admin.rpc('refresh_all_class_sessions');
    if (sessionsError) console.error('[cron/booking-emails] refresh_all_class_sessions', sessionsError.message);
    const reminders = await enqueueBookingReminders(admin, getTodayLima());
    const delivery = await dispatchOutbox(admin, 100);
    const purged = await purgeSentEmails(admin, 60);
    return NextResponse.json({ ok: true, newSessions: Number(newSessions ?? 0), reminders, purged, ...delivery });
  } catch (err) {
    console.error('[cron/booking-emails]', err);
    return NextResponse.json({ ok: false, error: 'No se pudieron procesar los correos' }, { status: 500 });
  }
}
