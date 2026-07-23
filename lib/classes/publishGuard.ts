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
