import type { SupabaseClient } from '@supabase/supabase-js';
import { renderEmail } from './templates';

// Envío de correos transaccionales con Resend (API REST, sin dependencias). El mismo proveedor
// que ya usa Supabase Auth. Variables: RESEND_API_KEY, EMAIL_FROM ("Kynea <reservas@dominio>"),
// NEXT_PUBLIC_SITE_URL. Sin RESEND_API_KEY no se envía nada y los correos esperan en la cola.

const MAX_ATTEMPTS = 5;
const DEFAULT_SITE_URL = 'https://kynea.dance';

export type SendResult =
  | { sent: true }
  | { sent: false; reason: 'not_configured' }
  | { sent: false; reason: 'error'; error: string };

export async function sendEmail(email: { to: string; subject: string; html: string; text: string }): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'not_configured' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Kynea <onboarding@resend.dev>',
        to: [email.to], subject: email.subject, html: email.html, text: email.text,
      }),
    });
    if (!res.ok) return { sent: false, reason: 'error', error: `Resend ${res.status}: ${(await res.text()).slice(0, 300)}` };
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: 'error', error: err instanceof Error ? err.message : String(err) };
  }
}

interface OutboxRow { id: string; to_email: string; template: string; payload: Record<string, unknown>; attempts: number }

/**
 * Despacha los correos pendientes de la cola. Nunca lanza: devuelve cuántos salieron o fallaron.
 * Los correos se "reclaman" con claim_email_outbox (migración 72): quedan en estado `sending` para
 * que dos ejecuciones simultáneas (la acción de reservar y el cron) no envíen el mismo correo.
 */
export async function dispatchOutbox(admin: SupabaseClient, limit = 25): Promise<{ sent: number; failed: number; skipped: number }> {
  const totals = { sent: 0, failed: 0, skipped: 0 };
  const { data, error } = await admin.rpc('claim_email_outbox', { p_limit: limit });
  if (error || !data) return totals;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  for (const row of data as OutboxRow[]) {
    const attempts = row.attempts + 1;
    let result: SendResult;
    try {
      result = await sendEmail({ to: row.to_email, ...renderEmail(row.template, row.payload, { siteUrl }) });
    } catch (err) {
      await admin.from('email_outbox').update({ status: 'failed', attempts, claimed_at: null, last_error: err instanceof Error ? err.message : String(err) }).eq('id', row.id);
      totals.failed += 1;
      continue;
    }
    if (result.sent) {
      await admin.from('email_outbox').update({ status: 'sent', attempts, claimed_at: null, sent_at: new Date().toISOString(), last_error: null }).eq('id', row.id);
      totals.sent += 1;
    } else if (result.reason === 'not_configured') {
      // Sin proveedor configurado el correo espera en la cola: se libera sin contar el intento.
      await admin.from('email_outbox').update({ status: 'pending', attempts: row.attempts, claimed_at: null }).eq('id', row.id);
      totals.skipped += 1;
    } else {
      await admin.from('email_outbox').update({ status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending', attempts, claimed_at: null, last_error: result.error }).eq('id', row.id);
      totals.failed += 1;
    }
  }
  return totals;
}
