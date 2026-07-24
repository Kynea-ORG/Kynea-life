'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { lookupDistrictId } from '@/lib/catalog/lookups';

export async function updateProfile(updates: {
  name?: string;
  bio?: string;
  nationality?: string;
  district_name?: string;
  district_city?: string;
  years_experience?: number;
  whatsapp?: string;
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
  // nationality is intentionally not written yet — the `profiles.nationality`
  // column only exists in migration 20, not applied to the connected database
  // yet. Writing it would 400 the whole update (all fields in this same
  // call), not just this one. Re-enable once the migration is confirmed live.
  if (updates.years_experience !== undefined) profileUpdate.years_experience = updates.years_experience;
  if (updates.whatsapp         !== undefined) profileUpdate.whatsapp = updates.whatsapp;
  if (updates.instagram        !== undefined) profileUpdate.instagram = updates.instagram;
  if (updates.tiktok           !== undefined) profileUpdate.tiktok = updates.tiktok;
  if (updates.youtube          !== undefined) profileUpdate.youtube = updates.youtube;
  if (updates.website          !== undefined) profileUpdate.website = updates.website;
  if (updates.photo_url        !== undefined) profileUpdate.photo_url = updates.photo_url;
  if (updates.photo_position   !== undefined) profileUpdate.photo_position = updates.photo_position;
  if (updates.photo_zoom       !== undefined) profileUpdate.photo_zoom = updates.photo_zoom;

  if (updates.district_name && updates.district_city) {
    const distId = await lookupDistrictId(supabase, updates.district_name, updates.district_city);
    if (distId) profileUpdate.district_id = distId;
  }

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
  revalidatePath('/dashboard');
}
