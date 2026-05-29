import { createClient } from '@/lib/supabase/server';
import type {
  DanceClass, Teacher, TimeSlot, ClassStatus, ClassType,
  DanceStyle, Level, Modality, PriceType,
} from '@/lib/types';

// ── Mapper: DB row (snake_case) → DanceClass (camelCase) ─────────────────────
// Keeps all existing UI components working without changes.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapTeacher(t: any): Teacher {
  return {
    id:           t.id,
    name:         t.name,
    type:         t.role as 'profesor' | 'academia' | 'colectivo',
    photo:        t.photo_url ?? '',
    city:         t.city ?? '',
    district:     t.district ?? '',
    bio:          t.bio ?? '',
    experience:   t.years_experience ?? 0,
    styles:       (t.dance_styles ?? []) as DanceStyle[],
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapDbClassToType(row: any): DanceClass {
  return {
    id:               row.id,
    type:             row.type as ClassType,
    title:            row.title,
    style:            row.style as DanceStyle,
    secondaryStyles:  row.secondary_styles as DanceStyle[],
    level:            row.level as Level,
    shortDescription: row.short_description ?? '',
    fullDescription:  row.full_description ?? '',
    whatYouLearn:     row.what_you_learn ?? [],
    forWhom:          row.for_whom,
    requirements:     row.requirements,
    startDate:        row.start_date ?? '',
    endDate:          row.end_date,
    timeSlots:        (row.time_slots ?? []) as TimeSlot[],
    priceType:        row.price_type as PriceType,
    price:            Number(row.price ?? 0),
    offerPrice:       row.offer_price ? Number(row.offer_price) : undefined,
    currency:         row.currency ?? 'PEN',
    maxSpots:         row.max_spots,
    availableSpots:   row.available_spots,
    isTrialFree:      row.is_trial_free,
    modality:         row.modality as Modality,
    city:             row.city ?? '',
    district:         row.district ?? '',
    venueName:        row.venue_name,
    address:          row.address,
    reference:        row.reference,
    mapsUrl:          row.maps_url,
    lat:              row.lat,
    lng:              row.lng,
    platform:         row.platform,
    accessLink:       row.access_link,
    coverImage:       row.cover_image ?? '',
    gallery:          row.gallery ?? [],
    videoUrl:         row.video_url,
    tiktokUrl:        row.tiktok_url,
    instagramUrl:     row.instagram_url,
    footwear:         row.footwear,
    clothing:         row.clothing,
    toBring:          row.to_bring ?? [],
    ageGroup:         row.age_group,
    prerequisites:    row.prerequisites,
    contactMode:      (row.contact_mode ?? 'whatsapp') as 'whatsapp' | 'instagram' | 'ambos',
    status:           row.status as ClassStatus,
    teacher:          row.teacher ? mapTeacher(row.teacher) : ({} as Teacher),
    metrics: {
      views:    row.views    ?? 0,
      contacts: row.contacts ?? 0,
      saved:    row.saved_count ?? 0,
    },
    createdAt:    row.created_at ?? '',
    publishedAt:  row.published_at,
  };
}

// ── Teacher SELECT fragment (joined from profiles) ────────────────────────────
const TEACHER_SELECT = `
  teacher:profiles!teacher_id (
    id, name, role, photo_url, city, district, bio,
    years_experience, whatsapp, instagram, tiktok, youtube, website,
    dance_styles
  )
`;

// ── Queries ───────────────────────────────────────────────────────────────────

export interface ClassFilters {
  style?:    string;
  level?:    string;
  modality?: string;
  city?:     string;
  query?:    string;
  days?:     string[];
  type?:     string;
  withSpots?: boolean;
}

export async function fetchPublishedClasses(filters?: ClassFilters): Promise<DanceClass[]> {
  const supabase = await createClient();

  let q = supabase
    .from('classes')
    .select(`*, ${TEACHER_SELECT}`)
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (filters?.style)    q = q.eq('style', filters.style);
  if (filters?.level)    q = q.eq('level', filters.level);
  if (filters?.modality) q = q.eq('modality', filters.modality);
  if (filters?.city)     q = q.eq('city', filters.city);
  if (filters?.type)     q = q.eq('type', filters.type);
  if (filters?.withSpots) q = q.gt('available_spots', 0);
  if (filters?.query) {
    q = q.or(`title.ilike.%${filters.query}%,style.ilike.%${filters.query}%`);
  }

  const { data, error } = await q;
  if (error) {
    console.error('fetchPublishedClasses error:', error.message);
    return [];
  }
  return (data ?? []).map(mapDbClassToType);
}

export async function fetchClassById(id: string): Promise<DanceClass | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('classes')
    .select(`*, ${TEACHER_SELECT}`)
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return mapDbClassToType(data);
}

export async function fetchSavedClasses(userId: string): Promise<DanceClass[]> {
  const supabase = await createClient();

  const { data: saved, error: savedErr } = await supabase
    .from('saved_classes')
    .select('class_id')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });

  if (savedErr || !saved?.length) return [];

  const ids = saved.map(r => r.class_id);

  const { data, error } = await supabase
    .from('classes')
    .select(`*, ${TEACHER_SELECT}`)
    .in('id', ids)
    .eq('status', 'published');

  if (error) {
    console.error('fetchSavedClasses error:', error.message);
    return [];
  }

  const order = new Map(ids.map((id, i) => [id, i]));
  return (data ?? [])
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    .map(mapDbClassToType);
}

export async function fetchFeaturedProfiles(role: 'profesor' | 'academia', limit = 4): Promise<Teacher[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role, photo_url, city, district, bio, years_experience, whatsapp, instagram, dance_styles, rating, total_classes')
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
    .select('id, name, role, photo_url, city, district, bio, years_experience, whatsapp, instagram, tiktok, youtube, website, dance_styles, rating, total_classes')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return mapTeacher(data);
}

export async function fetchTeacherClasses(teacherId: string): Promise<DanceClass[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('classes')
    .select(`*, ${TEACHER_SELECT}`)
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetchTeacherClasses error:', error.message);
    return [];
  }
  return (data ?? []).map(mapDbClassToType);
}
