import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth/getUser';
import { getPublicClient } from '@/lib/supabase/public';
import { safeCache } from '@/lib/cache';
import type { Teacher, DanceStyle } from '@/lib/types';

// The caller's own dashboard profile — columns shared by DashboardLayout,
// AdminLayout/fetchIsAdmin, and most /dashboard/* pages (role, name,
// photo_url, is_admin, academia status, contact-visibility toggles).
// Memoized per-request like getUser(): before this, each of those files ran
// its own SELECT for a handful of these same columns, so one navigation
// could trigger 3-4 near-identical 'profiles' queries in series. Pages
// needing a richer profile (e.g. Perfil, with bio/redes/profile_styles)
// still run their own dedicated query — this only covers the common subset.
export const getCurrentProfile = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, name, role, photo_url, is_admin, academia_approved_at, academia_welcome_seen_at, show_whatsapp, show_spots, views_count')
    .eq('id', user.id)
    .single();
  return data;
});

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

export interface TeacherClassActivity { count: number; lastPublishedAt: string | null }

// Pure — no I/O, so it's unit-testable without mocking Supabase. Groups raw
// classes rows (status='published', not expired) by teacher_id.
export function aggregateActiveClassCounts(
  rows: { teacher_id: string; published_at: string | null }[]
): Map<string, TeacherClassActivity> {
  const map = new Map<string, TeacherClassActivity>();
  for (const row of rows) {
    const entry = map.get(row.teacher_id) ?? { count: 0, lastPublishedAt: null };
    entry.count += 1;
    if (row.published_at && (!entry.lastPublishedAt || row.published_at > entry.lastPublishedAt)) {
      entry.lastPublishedAt = row.published_at;
    }
    map.set(row.teacher_id, entry);
  }
  return map;
}

// Pure — no I/O. Drops teachers with zero active classes, then orders by
// most active classes first, tie-broken by most recently published — there's
// no rating/popularity system in this schema to sort by instead (see Notion
// task "Home: ordenar/filtrar profesores destacados").
export function filterAndRankByActiveClasses(
  teachers: Teacher[],
  activityByTeacherId: Map<string, TeacherClassActivity>,
  limit: number
): Teacher[] {
  return teachers
    .filter(t => (activityByTeacherId.get(t.id)?.count ?? 0) > 0)
    .sort((a, b) => {
      const aAct = activityByTeacherId.get(a.id)!;
      const bAct = activityByTeacherId.get(b.id)!;
      if (bAct.count !== aAct.count) return bAct.count - aAct.count;
      return (bAct.lastPublishedAt ?? '').localeCompare(aAct.lastPublishedAt ?? '');
    })
    .slice(0, limit);
}

async function getFeaturedProfiles(role: 'profesor' | 'academia', limit?: number): Promise<Teacher[]> {
  const supabase = getPublicClient();
  let query = supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('role', role);

  // Las academias deben haber sido aprobadas por el admin para figurar en la lista pública
  if (role === 'academia') {
    query = query.not('academia_approved_at', 'is', null);
  }

  // Home's featured-profesor row is a curated preview (unlike the unlimited
  // call below, used by the "/profesores" directory, which must list
  // everyone including brand-new profiles) — it should only surface
  // profesores who actually have something bookable right now.
  const filterByActiveClasses = role === 'profesor' && limit !== undefined;

  // No limit = every profile with this role. When filtering by activity we
  // also skip the DB-level limit here — the real limit only applies after
  // ranking by class activity, below.
  if (limit !== undefined && !filterByActiveClasses) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error('fetchFeaturedProfiles error:', error.message);
    return [];
  }
  const teachers = (data ?? []).map(mapTeacher);
  if (!filterByActiveClasses) return teachers;

  // Current scale (tens of profesores) makes an unbounded fetch here trivial;
  // revisit with a DB-side aggregate if the profesor count grows a lot.
  const { data: classRows, error: classError } = await supabase
    .from('classes')
    .select('teacher_id, published_at')
    .eq('status', 'published')
    .or('end_date.is.null,end_date.gte.today')
    .in('teacher_id', teachers.map(t => t.id));
  if (classError) {
    console.error('fetchFeaturedProfiles (activity) error:', classError.message);
    return [];
  }
  const activity = aggregateActiveClassCounts(classRows ?? []);
  return filterAndRankByActiveClasses(teachers, activity, limit as number);
}

export const fetchFeaturedProfiles = safeCache(
  getFeaturedProfiles,
  ['featured_profiles'],
  { revalidate: 600, tags: ['profiles'] }
);

async function getTeacherBySlug(slug: string): Promise<Teacher | null> {
  const supabase = getPublicClient();
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

export const fetchTeacherBySlug = safeCache(
  getTeacherBySlug,
  ['teacher_by_slug'],
  { revalidate: 600, tags: ['profiles'] }
);

// Academias con coordenadas reales en su sede principal — para pintarlas
// como pines en la vista Mapa de /clases (ver ClasesMapView.tsx). Academias
// sin lat/lng (dirección cargada como texto libre antes del autocompletado
// de Google, o que nunca completaron esa sección) simplemente no aparecen
// — no inventamos una ubicación aproximada.
async function getAcademiasWithLocation(): Promise<Teacher[]> {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from('profiles')
    .select(`${PROFILE_SELECT}, venues!inner(address, district, city, lat, lng, is_primary)`)
    .eq('role', 'academia')
    .not('academia_approved_at', 'is', null)
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

export const fetchAcademiasWithLocation = safeCache(
  getAcademiasWithLocation,
  ['academias_with_location'],
  { revalidate: 600, tags: ['profiles'] }
);

// Búsqueda por nombre de profesor/academia — usada tanto por el resolver del
// buscador (Home, botón "Buscar"/Enter) como por /resultados. Dos queries en
// paralelo en vez de un solo .in('role', [...]) porque solo la academia
// necesita el filtro de aprobación; un profesor no tiene ese concepto. Sin
// safeCache a propósito: el texto de búsqueda es arbitrario por visitante,
// cachear por query terminaría acumulando entradas de un solo uso sin
// beneficio — la tabla profiles es chica y esto ya es rápido sin caché.
export async function searchProfilesByName(query: string): Promise<Teacher[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const supabase = getPublicClient();
  const [{ data: profesores }, { data: academias }] = await Promise.all([
    supabase.from('profiles').select(PROFILE_SELECT).eq('role', 'profesor').ilike('name', `%${trimmed}%`),
    supabase.from('profiles').select(PROFILE_SELECT).eq('role', 'academia')
      .not('academia_approved_at', 'is', null).ilike('name', `%${trimmed}%`),
  ]);
  return [...(profesores ?? []), ...(academias ?? [])].map(mapTeacher);
}
