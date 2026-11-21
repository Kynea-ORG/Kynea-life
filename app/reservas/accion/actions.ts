'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeRevalidateTag } from '@/lib/cache';
import { executeBookingActionByToken } from '@/lib/bookings/tokens';
import { enqueueBookingApprovedEmail } from '@/lib/email/confirmations';
import { enqueueCancellationEmails } from '@/lib/email/cancellations';
import { dispatchOutbox } from '@/lib/email/send';
import type { BookingStatus } from '@/lib/bookings/types';

export type TokenActionResponse =
  | { ok: true; outcome: 'confirmed' | 'released' | 'already_resolved'; currentStatus: BookingStatus }
  | { ok: false; message: string };

/**
 * Ejecuta en POST la aprobación o liberación 1-tap de una reserva desde el enlace del correo.
 * No requiere login: la autorización se valida contra el hash SHA-256 en `booking_action_tokens`.
 */
export async function submitBookingTokenAction(
  token: string,
  decision: 'confirm' | 'release',
): Promise<TokenActionResponse> {
  if (!token?.trim() || (decision !== 'confirm' && decision !== 'release')) {
    return { ok: false, message: 'El enlace no es válido.' };
  }

  const admin = createAdminClient();
  const result = await executeBookingActionByToken(admin, token, decision);
  if (!result.ok) {
    return {
      ok: false,
      message: result.reason === 'expired'
        ? 'Este enlace ya venció. Entra a tu panel de reservas para gestionar la solicitud.'
        : 'Este enlace no es válido o ya no está disponible.',
    };
  }

  if (result.outcome === 'confirmed') {
    await enqueueBookingApprovedEmail(admin, result.bookingId);
    after(async () => {
      try { await dispatchOutbox(createAdminClient(), 10); } catch (err) { console.error('[tokenAction dispatch]', err); }
    });
  } else if (result.outcome === 'released') {
    await enqueueCancellationEmails(admin, [result.bookingId], result.teacherId);
    after(async () => {
      try { await dispatchOutbox(createAdminClient(), 10); } catch (err) { console.error('[tokenAction dispatch]', err); }
    });
  }

  revalidatePath('/dashboard/reservas');
  revalidatePath('/dashboard/mis-reservas');
  revalidatePath('/dashboard/admin/resumen');
  safeRevalidateTag('classes', 'max');

  return {
    ok: true,
    outcome: result.outcome,
    currentStatus: result.currentStatus,
  };
}
