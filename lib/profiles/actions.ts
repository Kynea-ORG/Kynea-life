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
  team_size?: string;
  branch_count?: string;
  cover_image_url?: string;
  cover_image_position?: string;
  cover_image_zoom?: number;
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
  if (updates.team_size          !== undefined) profileUpdate.team_size = updates.team_size;
  if (updates.branch_count       !== undefined) profileUpdate.branch_count = updates.branch_count;
  if (updates.cover_image_url      !== undefined) profileUpdate.cover_image_url = updates.cover_image_url;
  if (updates.cover_image_position !== undefined) profileUpdate.cover_image_position = updates.cover_image_position;
  if (updates.cover_image_zoom     !== undefined) profileUpdate.cover_image_zoom = updates.cover_image_zoom;

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
//
// Collects the same "corporate" fields as a fresh academia signup's
// onboarding (see app/onboarding/page.tsx paso "Tu academia") — the profesor
// already has bio/contact/styles from their own onboarding, so this only
// asks for what's new. All fields optional, same criterio as onboarding:
// enriquecen el perfil, no bloquean la solicitud.
export async function requestAcademiaConversion(input: {
  name?: string;
  ruc?: string;
  teamSize?: string;
  branchCount?: string;
  address?: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  district?: string;
  city?: string;
  photoUrl?: string;
  photoPosition?: string;
  photoZoom?: number;
  coverImageUrl?: string;
  coverImagePosition?: string;
  coverImageZoom?: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  await updateProfile({
    name:                 input.name || undefined,
    ruc:                  input.ruc || undefined,
    team_size:            input.teamSize || undefined,
    branch_count:         input.branchCount || undefined,
    photo_url:            input.photoUrl || undefined,
    photo_position:       input.photoUrl ? input.photoPosition : undefined,
    photo_zoom:           input.photoUrl ? input.photoZoom : undefined,
    cover_image_url:      input.coverImageUrl || undefined,
    cover_image_position: input.coverImageUrl ? input.coverImagePosition : undefined,
    cover_image_zoom:     input.coverImageUrl ? input.coverImageZoom : undefined,
  });

  if (input.address?.trim()) {
    const { error: venueError } = await supabase.from('venues').insert({
      owner_id: user.id,
      name: input.name || 'Sede principal',
      address: input.address.trim(),
      district: input.district?.trim() || null,
      city: input.city?.trim() || null,
      place_id: input.placeId || null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      is_primary: true,
    });
    // 23505 = venues_one_primary_per_owner: ya existe una sede principal
    // (p.ej. reintento tras un error posterior) — nada que hacer.
    if (venueError && venueError.code !== '23505') throw new Error(venueError.message);
  }

  const { error } = await supabase.from('academia_requests').insert({
    profile_id: user.id,
    kind: 'conversion',
    ruc: input.ruc || null,
  });
  if (error) {
    // academia_requests_one_pending_per_profile (partial unique index)
    // rejects a second pending request — surface a friendly message
    // instead of the raw Postgres constraint error.
    if (error.code === '23505') throw new Error('Ya tienes una solicitud pendiente de revisión.');
    throw new Error(error.message);
  }

  // AcademiaConversionCard lives on the dashboard home, not Configuración.
  revalidatePath('/dashboard');
}

// Marca la pantalla de bienvenida de academia como vista — ver migración 42
// y AcademiaWelcomeModal.tsx. Se llama una sola vez, al cerrar el modal.
export async function dismissAcademiaWelcome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { error } = await supabase
    .from('profiles')
    .update({ academia_welcome_seen_at: new Date().toISOString() })
    .eq('id', user.id);
  if (error) throw new Error(error.message);

  revalidatePath('/dashboard', 'layout');
}
