'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function updateProfile(updates: {
  name?: string;
  bio?: string;
  nationality?: string;
  years_experience?: number;
  ruc?: string;
  whatsapp?: string;
  show_whatsapp?: boolean;
  show_spots?: boolean;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  website?: string;
  style_names?: string[];
  photo_url?: string;
  photo_position?: string;
  photo_zoom?: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const profileUpdate: Record<string, unknown> = {};
  if (updates.name             !== undefined) profileUpdate.name = updates.name;
  if (updates.bio              !== undefined) profileUpdate.bio = updates.bio;
  if (updates.nationality      !== undefined) profileUpdate.nationality = updates.nationality;
  if (updates.years_experience !== undefined) profileUpdate.years_experience = updates.years_experience;
  if (updates.ruc              !== undefined) profileUpdate.ruc = updates.ruc;
  if (updates.whatsapp         !== undefined) profileUpdate.whatsapp = updates.whatsapp;
  if (updates.show_whatsapp    !== undefined) profileUpdate.show_whatsapp = updates.show_whatsapp;
  if (updates.show_spots       !== undefined) profileUpdate.show_spots = updates.show_spots;
  if (updates.instagram        !== undefined) profileUpdate.instagram = updates.instagram;
  if (updates.tiktok           !== undefined) profileUpdate.tiktok = updates.tiktok;
  if (updates.youtube          !== undefined) profileUpdate.youtube = updates.youtube;
  if (updates.website          !== undefined) profileUpdate.website = updates.website;
  if (updates.photo_url        !== undefined) profileUpdate.photo_url = updates.photo_url;
  if (updates.photo_position   !== undefined) profileUpdate.photo_position = updates.photo_position;
  if (updates.photo_zoom       !== undefined) profileUpdate.photo_zoom = updates.photo_zoom;

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await supabase.from('profiles').update(profileUpdate).eq('id', user.id);
    if (error) throw new Error(error.message);
  }

  if (updates.style_names !== undefined) {
    const styleIds: number[] = [];
    if (updates.style_names.length > 0) {
      const { data: rows } = await supabase
        .from('dance_styles')
        .select('id')
        .in('name', updates.style_names);
      styleIds.push(...(rows ?? []).map(r => r.id));
    }
    await supabase.from('profile_styles').delete().eq('profile_id', user.id);
    if (styleIds.length > 0) {
      await supabase
        .from('profile_styles')
        .insert(styleIds.map(id => ({ profile_id: user.id, style_id: id })));
    }
  }

  revalidatePath('/dashboard/perfil');
  revalidatePath('/dashboard/configuracion');
  // 'layout' so the shared dashboard sidebar (name/photo, fetched in
  // app/dashboard/layout.tsx) revalidates too — it stays mounted across
  // client-side nav within /dashboard/*, so a plain 'page' revalidation
  // of '/dashboard' alone wouldn't refresh it.
  revalidatePath('/dashboard', 'layout');
}

// A profesor requesting to become an academia — see docs/TASKS.md sección 8.
// Does NOT touch `profiles.role`: the requester keeps functioning as a
// normal profesor with zero restriction while pending. `role` only changes
// when an admin approves via approve_academia_request() (Supabase RPC),
// the sole path the role-immutability trigger allows for this transition.
export async function requestAcademiaConversion(ruc?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { error } = await supabase.from('academia_requests').insert({
    profile_id: user.id,
    kind: 'conversion',
    ruc: ruc || null,
  });
  if (error) {
    // academia_requests_one_pending_per_profile (partial unique index)
    // rejects a second pending request — surface a friendly message
    // instead of the raw Postgres constraint error.
    if (error.code === '23505') throw new Error('Ya tienes una solicitud pendiente de revisión.');
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/configuracion');
}
