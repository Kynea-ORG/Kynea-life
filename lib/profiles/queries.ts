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
    slug:         t.slug ?? t.id,
    name:         t.name,
    type:         t.role as 'profesor' | 'academia',
    photo:        t.photo_url ?? '',
    photoPosition: t.photo_position || '50% 50%',
    photoZoom:    t.photo_zoom ?? 1,
    nationality:  t.nationality ?? undefined,
    bio:          t.bio ?? '',
    experience:   t.years_experience ?? 0,
    styles,
    // t.show_whatsapp is only present when the caller's SELECT includes it
    // (PROFILE_SELECT does, the teacher sub-select in CLASS_SELECT doesn't —
    // a class's own contact_mode is a separate, explicit choice the teacher
    // makes per listing, so hiding the number from the public profile page
    // shouldn't silently break a class already configured to contact via WhatsApp).
    whatsapp:     t.show_whatsapp === false ? '' : (t.whatsapp ?? ''),
    // Same "only when selected" caveat as show_whatsapp above — defaults to
    // visible when the caller's SELECT doesn't include the column.
    showSpots:    t.show_spots !== false,
    email:        '',
    instagram:    t.instagram,
    tiktok:       t.tiktok,
    youtube:      t.youtube,
    website:      t.website,
    rating:       t.rating,
    totalClasses: t.total_classes,
    // Campos corporativos — undefined si el caller no los seleccionó (p.ej.
    // el sub-select de teacher en CLASS_SELECT), harmless para 'profesor'.
    teamSize:           t.team_size ?? undefined,
    branchCount:        t.branch_count ?? undefined,
    coverImage:         t.cover_image_url ?? undefined,
    coverImagePosition: t.cover_image_position || undefined,
    coverImageZoom:     t.cover_image_zoom ?? undefined,
    venueAddress:       t.venue?.address ?? undefined,
    venueDistrict:      t.venue?.district ?? undefined,
    venueCity:          t.venue?.city ?? undefined,
    venueLat:           t.venue?.lat ?? undefined,
    venueLng:           t.venue?.lng ?? undefined,
  };
}

export const PROFILE_SELECT = `
  id, slug, name, role, photo_url, photo_position, photo_zoom, bio, years_experience,
  nationality, whatsapp, show_whatsapp, instagram, tiktok, youtube, website,
  team_size, branch_count, cover_image_url, cover_image_position, cover_image_zoom,
  profile_styles(style_id, dance_styles(name))
`;

export async function fetchFeaturedProfiles(role: 'profesor' | 'academia', limit?: number): Promise<Teacher[]> {
  const supabase = await createClient();
  let query = supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('role', role);
  // No limit = every profile with this role — used by the "/profesores"
  // directory page, which must list everyone, not just a Home-page preview.
  if (limit !== undefined) query = query.limit(limit);
  const { data, error } = await query;
  if (error) {
    console.error('fetchFeaturedProfiles error:', error.message);
    return [];
  }
  return (data ?? []).map(mapTeacher);
}

export async function fetchTeacherBySlug(slug: string): Promise<Teacher | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('slug', slug)
    .single();
  if (error || !data) return null;

  // Sede principal — solo relevante para academia, y se busca aparte en vez
  // de un embed porque venues no tiene una FK única hacia profiles desde acá
  // (es owner_id, uno-a-muchos) y queremos filtrar por is_primary sin pelear
  // con la sintaxis de embed filtrado de PostgREST.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let venue: any = null;
  if (data.role === 'academia') {
    const { data: venueRow } = await supabase
      .from('venues')
      .select('address, district, city, lat, lng')
      .eq('owner_id', data.id)
      .eq('is_primary', true)
      .maybeSingle();
    venue = venueRow;
  }

  return mapTeacher({ ...data, venue });
}

// Academias con coordenadas reales en su sede principal — para pintarlas
// como pines en la vista Mapa de /clases (ver ClasesMapView.tsx). Academias
// sin lat/lng (dirección cargada como texto libre antes del autocompletado
// de Google, o que nunca completaron esa sección) simplemente no aparecen
// — no inventamos una ubicación aproximada.
export async function fetchAcademiasWithLocation(): Promise<Teacher[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select(`${PROFILE_SELECT}, venues!inner(address, district, city, lat, lng, is_primary)`)
    .eq('role', 'academia')
    .eq('venues.is_primary', true)
    .not('venues.lat', 'is', null)
    .not('venues.lng', 'is', null);
  if (error) {
    console.error('fetchAcademiasWithLocation error:', error.message);
    return [];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => {
    const venue = Array.isArray(row.venues) ? row.venues[0] : row.venues;
    return mapTeacher({ ...row, venue });
  });
}
