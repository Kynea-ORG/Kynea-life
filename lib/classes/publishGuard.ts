import type { SupabaseClient } from '@supabase/supabase-js';
import { publishError } from './validation';

export type ContactChannel = 'whatsapp' | 'instagram';

export interface ContactProfile {
  whatsapp: string | null;
  instagram: string | null;
}

// ─── Pure decision logic ────────────────────────────────────────────────────
// No DB access — easy to unit test with a mocked profile shape.

export function missingContactChannels(contactMode: string, profile: ContactProfile): ContactChannel[] {
  const missing: ContactChannel[] = [];
  if (contactMode === 'whatsapp' || contactMode === 'both') {
    if (!profile.whatsapp || !profile.whatsapp.trim()) missing.push('whatsapp');
  }
  if (contactMode === 'instagram' || contactMode === 'both') {
    if (!profile.instagram || !profile.instagram.trim()) missing.push('instagram');
  }
  return missing;
}

function missingChannelMessage(missing: ContactChannel[]): string {
  if (missing.length === 2) {
    return 'Agrega tu WhatsApp e Instagram en tu perfil para poder publicar esta clase.';
  }
  const label = missing[0] === 'whatsapp' ? 'WhatsApp' : 'Instagram';
  return `Agrega tu ${label} en tu perfil para poder publicar esta clase.`;
}

// ─── Server-side guard ───────────────────────────────────────────────────────
// Fetches the teacher's profile and blocks publish when the contact
// channel(s) implied by contactMode are missing. Only called when a class
// status transitions to 'published' — draft saves never reach this guard.

export async function assertContactChannel(
  supabase: SupabaseClient,
  userId: string,
  contactMode: string
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('whatsapp, instagram')
    .eq('id', userId)
    .single();

  const missing = missingContactChannels(contactMode, {
    whatsapp: profile?.whatsapp ?? null,
    instagram: profile?.instagram ?? null,
  });

  if (missing.length > 0) {
    throw publishError({ code: 'MISSING_CONTACT_CHANNEL', missing, message: missingChannelMessage(missing) });
  }
}

// ─── Academia approval gate ─────────────────────────────────────────────────
// A brand-new academia (registered via /academias) starts with
// academia_approved_at = null — it can do everything else (onboarding,
// editing its profile, saving drafts) but can't publish until Kynea reviews
// it. A profesor converting to academia never passes through this gated
// state: the conversion only flips `role` at the moment it's approved (see
// approve_academia_request() in supabase/migrations), so by the time an
// account is role='academia' via conversion, academia_approved_at is
// already set. Only called when status transitions to 'published'.

export async function assertAcademiaApproved(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academia_approved_at')
    .eq('id', userId)
    .single();

  if (profile?.role === 'academia' && !profile.academia_approved_at) {
    throw publishError({
      code: 'ACADEMIA_NOT_APPROVED',
      message: 'Tu academia todavía está en revisión — puedes guardar como borrador mientras tanto.',
    });
  }
}
