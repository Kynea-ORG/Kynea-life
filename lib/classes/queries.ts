import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { mapTeacher } from '@/lib/profiles/queries';
import { DAY_MAP } from './helpers';
import type {
  DanceClass, Teacher, TimeSlot, ClassStatus, ClassType,
  DanceStyle, Level, Modality, PriceType,
} from '@/lib/types';
import type { ClassFilters, DbClassRow, DbClassStyle } from './types';

export type { ClassFilters };

// day_of_week: 0 = Lunes ... 6 = Domingo (ISO/Peru convention)
const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function schedulesToTimeSlots(schedules: DbClassRow['class_schedules']): TimeSlot[] {
  const groups = new Map<string, { days: string[]; startTime: string; endTime: string }>();
  for (const s of (schedules ?? [])) {
    const key = `${s.start_time}|${s.end_time}`;
    if (!groups.has(key)) groups.set(key, { days: [], startTime: s.start_time, endTime: s.end_time });
    groups.get(key)!.days.push(DAY_NAMES[s.day_of_week] ?? '');
  }
  return Array.from(groups.values());
}

export function mapDbClassToType(row: DbClassRow): DanceClass {
  const stylesRows: DbClassStyle[] = row.class_styles ?? [];
  const mainStyleRow = stylesRows.find((s) => s.is_main);
  const style: DanceStyle = mainStyleRow?.dance_styles?.name ?? '';
  const secondaryStyles = stylesRows
    .filter((s) => !s.is_main)
    .map((s) => s.dance_styles?.name as DanceStyle)
    .filter(Boolean);

  const venue = row.venue;

  return {
    id:               row.id,
    type:             row.type as ClassType,
    title:            row.title,
    slug:             row.slug ?? undefined,
    style,
    secondaryStyles:  secondaryStyles.length ? secondaryStyles : undefined,
    level:            (row.level?.name ?? '') as Level,
    shortDescription: row.short_description ?? '',
    fullDescription:  row.full_description ?? '',
    whatYouLearn:     row.what_you_learn ?? [],
    forWhom:          row.for_whom ?? undefined,
    requirements:     row.requirements ?? undefined,
    startDate:        row.start_date ?? '',
    endDate:          row.end_date ?? undefined,
    timeSlots:        schedulesToTimeSlots(row.class_schedules ?? []),
    priceType:        row.price_type as PriceType,
    price:            Number(row.price ?? 0),
    offerPrice:       row.offer_price ? Number(row.offer_price) : undefined,
    currency:         row.currency ?? 'PEN',
    maxSpots:         row.max_spots ?? undefined,
    availableSpots:   row.available_spots ?? undefined,
    isTrialFree:      row.is_trial_free ?? undefined,
    modality:         row.modality as Modality,
    city:             venue?.district?.city ?? '',
    district:         venue?.district?.name ?? '',
    venueName:        venue?.name ?? undefined,
    address:          venue?.address ?? undefined,
    reference:        venue?.reference ?? undefined,
    mapsUrl:          venue?.maps_url ?? undefined,
    placeId:          venue?.place_id ?? undefined,
    lat:              venue?.lat ?? undefined,
    lng:              venue?.lng ?? undefined,
    platform:         row.platform ?? undefined,
    accessLink:       row.access_link ?? undefined,
    coverImage:       row.cover_image ?? '',
    gallery:          row.gallery ?? [],
    videoUrl:         row.video_url ?? undefined,
    footwear:         row.footwear ?? undefined,
    clothing:         row.clothing ?? undefined,
    toBring:          row.to_bring ?? [],
    ageGroup:         row.age_group ?? undefined,
    contactMode:      (row.contact_mode ?? 'whatsapp') as 'whatsapp' | 'instagram' | 'both',
    status:           row.status as ClassStatus,
    teacher:          row.teacher ? mapTeacher(row.teacher) : ({} as Teacher),
    metrics: {
      views:    row.views_count    ?? 0,
      contacts: row.contacts_count ?? 0,
      saved:    row.saved_count    ?? 0,
    },
    createdAt:   row.created_at ?? '',
    publishedAt: row.published_at ?? undefined,
  };
}

// ── SELECT fragments ──────────────────────────────────────────────────────────

export const CLASS_SELECT = `
  *,
  level:class_levels(id, name),
  class_styles(style_id, is_main, dance_styles(id, name)),
  class_schedules(id, day_of_week, start_time, end_time),
  venue:venues(name, address, reference, maps_url, place_id, lat, lng, district:districts(name, city)),
  teacher:profiles!teacher_id(
    id, name, role, photo_url, bio, years_experience,
    whatsapp, instagram, tiktok, youtube, website,
    district:districts(name, city),
    profile_styles(style_id, dance_styles(name))
  )
`;

// ── Filter resolution helpers (each returns null = filter inactive, [] = no matches) ─────────

async function resolveStyleClassIds(
  supabase: SupabaseClient,
  styles: string[] | undefined
): Promise<string[] | null> {
  if (!styles?.length) return null;
  const { data: styleRows } = await supabase
    .from('dance_styles').select('id').in('name', styles);
  const styleIds = (styleRows ?? []).map((r: { id: number }) => r.id);
  if (!styleIds.length) return [];
  const { data } = await supabase
    .from('class_styles').select('class_id').in('style_id', styleIds);
  return [...new Set((data ?? []).map((r: { class_id: string }) => r.class_id))];
}

async function resolveLevelIds(
  supabase: SupabaseClient,
  levels: string[] | undefined
): Promise<number[] | null> {
  if (!levels?.length) return null;
  const { data } = await supabase
    .from('class_levels').select('id').in('name', levels);
  return (data ?? []).map((r: { id: number }) => r.id);
}

async function resolveDayClassIds(
  supabase: SupabaseClient,
  days: string[] | undefined
): Promise<string[] | null> {
  if (!days?.length) return null;
  const dayNums = days.map(d => DAY_MAP[d]).filter((n): n is number => n !== undefined);
  if (!dayNums.length) return null;
  const { data } = await supabase
    .from('class_schedules').select('class_id').in('day_of_week', dayNums);
  return [...new Set((data ?? []).map((r: { class_id: string }) => r.class_id))];
}

async function resolveCityVenueIds(
  supabase: SupabaseClient,
  city: string | undefined
): Promise<string[] | null> {
  if (!city) return null;
  const { data: districtRows } = await supabase
    .from('districts').select('id').eq('city', city);
  const districtIds = (districtRows ?? []).map((r: { id: number }) => r.id);
  if (!districtIds.length) return [];
  const { data } = await supabase
    .from('venues').select('id').in('district_id', districtIds);
  return (data ?? []).map((r: { id: string }) => r.id);
}

// ── Class queries ─────────────────────────────────────────────────────────────

export async function fetchPublishedClasses(filters?: ClassFilters): Promise<DanceClass[]> {
  const supabase = await createClient();

  // Resolve join-based filters in parallel — null means inactive, [] means no matches
  const [styleClassIds, levelIds, dayClassIds, cityVenueIds] = await Promise.all([
    resolveStyleClassIds(supabase, filters?.styles),
    resolveLevelIds(supabase, filters?.levels),
    resolveDayClassIds(supabase, filters?.days),
    resolveCityVenueIds(supabase, filters?.city),
  ]);

  // Early exit: any active filter resolved to zero matches → no results possible
  if (styleClassIds?.length === 0 || levelIds?.length === 0 ||
      dayClassIds?.length === 0 || cityVenueIds?.length === 0) {
    return [];
  }

  let q = supabase
    .from('classes')
    .select(CLASS_SELECT)
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  // Direct-column filters
  if (filters?.modalities?.length) q = q.in('modality', filters.modalities);
  if (filters?.types?.length)      q = q.in('type', filters.types);
  if (filters?.withSpots)          q = q.gt('available_spots', 0);
  if (filters?.query)              q = q.ilike('title', `%${filters.query}%`);

  // ID-based filters (from join resolution)
  if (styleClassIds?.length) q = q.in('id', styleClassIds);
  if (levelIds?.length)      q = q.in('level_id', levelIds);
  if (dayClassIds?.length)   q = q.in('id', dayClassIds);
  if (cityVenueIds?.length)  q = q.in('venue_id', cityVenueIds);

  const { data, error } = await q;
  if (error) {
    console.error('fetchPublishedClasses error:', error.message);
    return [];
  }
  return (data ?? []).map(row => mapDbClassToType(row as unknown as DbClassRow));
}

export async function fetchClassById(id: string): Promise<DanceClass | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('classes')
    .select(CLASS_SELECT)
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return mapDbClassToType(data as unknown as DbClassRow);
}

export async function fetchSavedClasses(userId: string): Promise<DanceClass[]> {
  const supabase = await createClient();

  const { data: saved, error: savedErr } = await supabase
    .from('saved_classes')
    .select('class_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (savedErr || !saved?.length) return [];

  const ids = saved.map(r => r.class_id);

  const { data, error } = await supabase
    .from('classes')
    .select(CLASS_SELECT)
    .in('id', ids)
    .eq('status', 'published');

  if (error) {
    console.error('fetchSavedClasses error:', error.message);
    return [];
  }

  const order = new Map(ids.map((id: string, i: number) => [id, i]));
  return (data ?? [])
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    .map(row => mapDbClassToType(row as unknown as DbClassRow));
}

export async function fetchTeacherClasses(teacherId: string): Promise<DanceClass[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('classes')
    .select(CLASS_SELECT)
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetchTeacherClasses error:', error.message);
    return [];
  }
  return (data ?? []).map(row => mapDbClassToType(row as unknown as DbClassRow));
}
