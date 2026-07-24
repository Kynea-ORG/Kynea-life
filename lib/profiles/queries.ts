import { createClient } from '@/lib/supabase/server';
import type { Teacher, DanceStyle } from '@/lib/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapTeacher(t: any): Teacher {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const styles = ((t.profile_styles ?? []) as any[])
    .map((ps) => ps.dance_styles?.name as DanceStyle)
    .filter(Boolean);
  return {
    id:           t.id,
    name:         t.name,
    type:         t.role as 'profesor' | 'academia',
    photo:        t.photo_url ?? '',
    photoPosition: t.photo_position || '50% 50%',
    photoZoom:    t.photo_zoom ?? 1,
    nationality:  t.nationality ?? undefined,
    bio:          t.bio ?? '',
    experience:   t.years_experience ?? 0,
    styles,
    whatsapp:     t.whatsapp ?? '',
    email:        '',
    instagram:    t.instagram,
    tiktok:       t.tiktok,
    youtube:      t.youtube,
    website:      t.website,
    rating:       t.rating,
    totalClasses: t.total_classes,
  };
}

export const PROFILE_SELECT = `
  id, name, role, photo_url, photo_position, photo_zoom, bio, years_experience,
  nationality, whatsapp, instagram, tiktok, youtube, website,
  profile_styles(style_id, dance_styles(name))
`;

export async function fetchFeaturedProfiles(role: 'profesor' | 'academia', limit = 4): Promise<Teacher[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('role', role)
    .limit(limit);
  if (error) {
    console.error('fetchFeaturedProfiles error:', error.message);
    return [];
  }
  return (data ?? []).map(mapTeacher);
}

export async function fetchTeacherById(id: string): Promise<Teacher | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return mapTeacher(data);
}
