import { createClient } from '@/lib/supabase/server';
import { getPublicClient } from '@/lib/supabase/public';
import { safeCache } from '@/lib/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { mapTeacher } from '@/lib/profiles/queries';
import { searchKeywords } from '@/lib/search/normalize';
import { DAY_MAP } from './helpers';
import type {
  DanceClass, Teacher, TimeSlot, ClassStatus, ClassType,
  DanceStyle, Level, Modality, PriceType,
} from '@/lib/types';
import type { ClassFilters, DbClassRow, DbClassStyle } from './types';

export type { ClassFilters };

// day_of_week: 0 = Lunes ... 6 = Domingo (ISO/Peru convention)
const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// footwear/requirements moved from single-value text to multi-select text[]
// via migration 21 — normalizes either shape so reads never crash whether or
// not that migration has been applied to the connected database yet.
function toStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) return value.length ? value : undefined;
  if (typeof value === 'string' && value) return [value];
  return undefined;
}

function schedulesToTimeSlots(schedules: DbClassRow['class_schedules']): TimeSlot[] {
  const groups = new Map<string, { days: string[]; startTime: string; endTime: string }>();
  for (const s of (schedules ?? [])) {
    const key = `${s.start_time}|${s.end_time}`;
    if (!groups.has(key)) groups.set(key, { days: [], startTime: s.start_time, endTime: s.end_time });
    const day = DAY_NAMES[s.day_of_week] ?? '';
    // Duplicate class_schedules rows (same day + same time) can exist from
    // legacy inserts — never surface the same day twice for a given slot.
    const group = groups.get(key)!;
    if (day && !group.days.includes(day)) group.days.push(day);
  }
  return Array.from(groups.values());
}

export function mapDbClassToType(row: DbClassRow): DanceClass {
  const stylesRows: DbClassStyle[] = row.class_styles ?? [];
  const mainStyleRow = stylesRows.find((s) => s.is_main);
  const style: DanceStyle = mainStyleRow?.dance_styles?.name ?? '';
  const styleSlug = mainStyleRow?.dance_styles?.slug ?? '';
  const secondaryStyles = stylesRows
    .filter((s) => !s.is_main)
    .map((s) => s.dance_styles?.name as DanceStyle)
    .filter(Boolean);

  const venue = row.venue;

  return {
    id:               row.id,
    type:             row.type as ClassType,
    title:            row.title,
    slug:             row.slug ?? row.id,
    style,
    styleSlug,
    secondaryStyles:  secondaryStyles.length ? secondaryStyles : undefined,
    level:            (row.level?.name ?? '') as Level,
    shortDescription: row.short_description ?? '',
    fullDescription:  row.full_description ?? '',
    whatYouLearn:     row.what_you_learn ?? [],
    forWhom:          row.for_whom ?? undefined,
    requirements:     toStringArray(row.requirements),
    startDate:        row.start_date ?? '',
    endDate:          row.end_date ?? undefined,
    recurrence:       row.recurrence ?? 'mensual',
    timeSlots:        schedulesToTimeSlots(row.class_schedules ?? []),
    priceType:        row.price_type as PriceType,
    price:            Number(row.price ?? 0),
    offerPrice:       row.offer_price ? Number(row.offer_price) : undefined,
    currency:         row.currency ?? 'PEN',
    maxSpots:         row.max_spots ?? undefined,
    availableSpots:   row.available_spots ?? undefined,
    isTrialFree:      row.is_trial_free ?? undefined,
    modality:         row.modality as Modality,
    city:             venue?.city ?? '',
    district:         venue?.district ?? '',
    countryCode:      venue?.country_code ?? undefined,
    venueName:        venue?.name ?? undefined,
    address:          venue?.address ?? undefined,
    reference:        venue?.reference ?? undefined,
    mapsUrl:          venue?.maps_url ?? undefined,
    placeId:          venue?.place_id ?? undefined,
    lat:              venue?.lat ?? undefined,
    lng:              venue?.lng ?? undefined,
    mapImageUrl:      venue?.map_image_url ?? undefined,
    platform:         row.platform ?? undefined,
    accessLink:       row.access_link ?? undefined,
    coverImage:       row.cover_image ?? '',
    coverImagePosition: row.cover_image_position || '50% 50%',
    coverImageZoom:   row.cover_image_zoom ?? 1,
    gallery:          row.gallery ?? [],
    videoUrl:         row.video_url ?? undefined,
    footwear:         toStringArray(row.footwear),
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
  class_styles(style_id, is_main, dance_styles(id, name, slug)),
  class_schedules(id, day_of_week, start_time, end_time),
  venue:venues(name, address, reference, maps_url, place_id, lat, lng, city, district, country_code, map_image_url),
  teacher:profiles!teacher_id(
    id, slug, name, role, photo_url, photo_position, photo_zoom, nationality, bio, years_experience,
    whatsapp, show_spots, instagram, tiktok, youtube, website,
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

async function resolveLocationVenueIds(
  supabase: SupabaseClient,
  city: string | undefined,
  district: string | undefined
): Promise<string[] | null> {
  if (!city && !district) return null;
  let q = supabase.from('venues').select('id');
  if (city) {
    const cleanCity = city.trim().replace(/^provincia de /i, '').replace(/ province$/i, '');
    q = q.ilike('city', `%${cleanCity}%`);
  }
  if (district) {
    const trimmedDistrict = district.trim();
    if (trimmedDistrict.toLowerCase() === 'santiago de surco' || trimmedDistrict.toLowerCase() === 'surco') {
      q = q.ilike('district', '%Surco%');
    } else {
      q = q.ilike('district', `%${trimmedDistrict}%`);
    }
  }
  const { data } = await q;
  return (data ?? []).map((r: { id: string }) => r.id);
}

async function resolveCountryVenueIds(
  supabase: SupabaseClient,
  country: string | undefined
): Promise<string[] | null> {
  if (!country) return null;
  const { data } = await supabase
    .from('venues').select('id').eq('country_code', country);
  return (data ?? []).map((r: { id: string }) => r.id);
}

// PostgREST .or() filter strings break on raw commas/parens in the value —
// strip them so a free-text search never corrupts the filter syntax.
function sanitizeForOrFilter(text: string): string {
  return text.replace(/[,()]/g, ' ').trim();
}

// One search keyword's match condition, ORed across every field it could
// plausibly hit (title, dance style, venue city/district) — e.g. for
// "miraflores" this becomes "title ILIKE %miraflores% OR venue_id IN (...) OR
// id IN (...)". Returns null when the keyword resolves to nothing at all (no
// title can match it either, once sanitized down to nothing).
async function resolveKeywordCondition(
  supabase: SupabaseClient,
  keyword: string
): Promise<string | null> {
  const safe = sanitizeForOrFilter(keyword);
  if (!safe) return null;

  const [{ data: venueRows }, { data: styleRows }] = await Promise.all([
    supabase.from('venues').select('id').or(`city.ilike.%${safe}%,district.ilike.%${safe}%`),
    supabase.from('dance_styles').select('id').ilike('name', `%${safe}%`),
  ]);
  const venueIds = (venueRows ?? []).map((r: { id: string }) => r.id);
  const styleIds = (styleRows ?? []).map((r: { id: number }) => r.id);

  let styleClassIds: string[] = [];
  if (styleIds.length) {
    const { data } = await supabase.from('class_styles').select('class_id').in('style_id', styleIds);
    styleClassIds = [...new Set((data ?? []).map((r: { class_id: string }) => r.class_id))];
  }

  const orParts = [`title.ilike.%${safe}%`];
  if (venueIds.length) orParts.push(`venue_id.in.(${venueIds.join(',')})`);
  if (styleClassIds.length) orParts.push(`id.in.(${styleClassIds.join(',')})`);
  return orParts.join(',');
}

// Lets the free-text search box understand a full phrase, not just a
// literal substring — "salsa en miraflores" needs to require BOTH "salsa"
// (title or dance style) AND "miraflores" (title or venue), each checked
// across every field independently. Chaining one .or() call per keyword
// onto the query builder is what gives that AND-across-keywords,
// OR-across-fields shape: PostgREST ANDs separately chained filters
// together, so this reads as (kw1 in title|style|venue) AND (kw2 in
// title|style|venue) AND ... — a class matching only "miraflores" (a
// common district shared by dozens of unrelated classes) no longer
// drowns out ones that actually match every word the user typed.
async function resolveKeywordConditions(
  supabase: SupabaseClient,
  keywords: string[]
): Promise<string[]> {
  const conditions = await Promise.all(keywords.map(kw => resolveKeywordCondition(supabase, kw)));
  return conditions.filter((c): c is string => c !== null);
}

// ── Class queries ─────────────────────────────────────────────────────────────

function serializeFilters(filters?: ClassFilters): string {
  if (!filters) return '';
  const norm: Record<string, unknown> = {};
  if (filters.query?.trim())       norm.query = filters.query.trim().toLowerCase();
  if (filters.styles?.length)      norm.styles = [...filters.styles].sort();
  if (filters.levels?.length)      norm.levels = [...filters.levels].sort();
  if (filters.modalities?.length)  norm.modalities = [...filters.modalities].sort();
  if (filters.types?.length)       norm.types = [...filters.types].sort();
  if (filters.days?.length)        norm.days = [...filters.days].sort();
  if (filters.city?.trim())        norm.city = filters.city.trim().toLowerCase();
  if (filters.country?.trim())     norm.country = filters.country.trim().toUpperCase();
  if (filters.district?.trim())    norm.district = filters.district.trim().toLowerCase();
  if (filters.withSpots)           norm.withSpots = true;
  return Object.keys(norm).length ? JSON.stringify(norm) : '';
}

async function queryPublishedClasses(filters?: ClassFilters): Promise<DanceClass[]> {
  const supabase = getPublicClient();
  const keywords = filters?.query ? searchKeywords(filters.query) : [];

  // Resolve join-based filters in parallel — null means inactive, [] means no matches
  const [styleClassIds, levelIds, dayClassIds, locationVenueIds, countryVenueIds, keywordConditions] = await Promise.all([
    resolveStyleClassIds(supabase, filters?.styles),
    resolveLevelIds(supabase, filters?.levels),
    resolveDayClassIds(supabase, filters?.days),
    resolveLocationVenueIds(supabase, filters?.city, filters?.district),
    resolveCountryVenueIds(supabase, filters?.country),
    resolveKeywordConditions(supabase, keywords),
  ]);

  // Early exit: any active filter resolved to zero matches → no results possible
  if (styleClassIds?.length === 0 || levelIds?.length === 0 ||
      dayClassIds?.length === 0 || locationVenueIds?.length === 0 || countryVenueIds?.length === 0) {
    return [];
  }

  let q = supabase
    .from('classes')
    .select(CLASS_SELECT)
    .eq('status', 'published')
    // Talleres/clases con fecha de fin ya vencida no deben listarse — una
    // clase recurrente sin end_date (null) sigue activa indefinidamente.
    .or('end_date.is.null,end_date.gte.today')
    .order('published_at', { ascending: false });

  // Direct-column filters
  if (filters?.modalities?.length) q = q.in('modality', filters.modalities);
  if (filters?.types?.length)      q = q.in('type', filters.types);
  if (filters?.withSpots)          q = q.gt('available_spots', 0);

  // Free-text search: every keyword must match SOMEWHERE (title, dance
  // style, or venue city/district) — see resolveKeywordConditions. Chaining
  // one .or() per keyword is what makes them all required at once instead
  // of any single one being enough.
  for (const condition of keywordConditions) q = q.or(condition);

  // ID-based filters (from join resolution)
  if (styleClassIds?.length)    q = q.in('id', styleClassIds);
  if (levelIds?.length)         q = q.in('level_id', levelIds);
  if (dayClassIds?.length)      q = q.in('id', dayClassIds);
  if (locationVenueIds?.length) q = q.in('venue_id', locationVenueIds);
  if (countryVenueIds?.length)  q = q.in('venue_id', countryVenueIds);

  const { data, error } = await q;
  if (error) {
    console.error('fetchPublishedClasses error:', error.message);
    return [];
  }
  return (data ?? []).map(row => mapDbClassToType(row as unknown as DbClassRow));
}

const getCachedPublishedClasses = safeCache(
  async (filterKey: string): Promise<DanceClass[]> => {
    const filters = filterKey ? (JSON.parse(filterKey) as ClassFilters) : undefined;
    return queryPublishedClasses(filters);
  },
  ['published_classes'],
  { revalidate: 300, tags: ['classes'] }
);

export async function fetchPublishedClasses(filters?: ClassFilters): Promise<DanceClass[]> {
  const filterKey = serializeFilters(filters);
  return getCachedPublishedClasses(filterKey);
}

// Distinct countries with at least one published class — for the "País"
// filter option list. Deliberately unfiltered (reuses the same cached
// all-classes fetch as the no-filters case) so the option list doesn't
// shrink just because some other filter is currently active.
export async function fetchClassCountries(): Promise<string[]> {
  const classes = await fetchPublishedClasses();
  return [...new Set(classes.map(c => c.countryCode).filter((c): c is string => Boolean(c)))].sort();
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

async function getClassBySlug(slug: string): Promise<DanceClass | null> {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from('classes')
    .select(CLASS_SELECT)
    .eq('slug', slug)
    .single();
  if (error || !data) return null;
  return mapDbClassToType(data as unknown as DbClassRow);
}

export const fetchClassBySlug = safeCache(
  getClassBySlug,
  ['class_by_slug'],
  { revalidate: 300, tags: ['classes'] }
);

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
