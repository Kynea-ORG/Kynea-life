import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processPendingConfirmations } from '@/lib/email/confirmations';
import { dispatchOutbox } from '@/lib/email/send';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function hasValidCronSecret(request: NextRequest, secret: string | undefined): boolean {
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`, 'utf8');
  const provided = Buffer.from(request.headers.get('authorization') ?? '', 'utf8');
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

// Cron cada hora (Vercel Pro):
// 1) Aviso pre-clase al profesor cuando entra en reminder_hours_before con pendientes.
// 2) Último recordatorio post-clase (~12h) antes del cierre automático.
// 3) Cierre silencioso (+48h post-clase) a 'expired' sin enviar correo al alumno.
// 4) Despacho de cola de correos.
export async function GET(request: NextRequest) {
  if (!hasValidCronSecret(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const admin = createAdminClient();
    const summary = await processPendingConfirmations(admin);
    const delivery = await dispatchOutbox(admin, 100);
    return NextResponse.json({ ok: true, ...summary, ...delivery });
  } catch (err) {
    console.error('[cron/booking-confirmations]', err);
    return NextResponse.json({ ok: false, error: 'No se pudieron procesar las confirmaciones' }, { status: 500 });
  }
}
