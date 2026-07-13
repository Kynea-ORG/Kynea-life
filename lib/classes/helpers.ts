import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClassStatus, ClassType, PriceType, Modality } from '@/lib/types';
import type { FormSlot, ClassUpdatePayload } from './types';

// day_of_week: 0 = Lunes ... 6 = Domingo (ISO/Peru convention)
export const DAY_MAP: Record<string, number> = {
  'Lunes': 0, 'Martes': 1, 'Miércoles': 2, 'Jueves': 3,
  'Viernes': 4, 'Sábado': 5, 'Domingo': 6,
};

export function venueNeedsUpdate(
  current: { place_id: string | null; address: string | null } | null,
  incoming: { placeId: string | null; address: string }
): boolean {
  if (!current) return true;
  if (current.place_id && incoming.placeId) return current.place_id !== incoming.placeId;
  if (!incoming.placeId) return current.address !== incoming.address;
  return true;
}

export async function findOrCreateVenue(
  supabase: SupabaseClient,
  ownerId: string,
  opts: {
    name: string; address: string; reference: string; districtId: number | null;
    placeId: string | null; lat: number | null; lng: number | null;
  }
): Promise<string | null> {
  if (opts.placeId) {
    const { data: existing, error: lookupError } = await supabase
      .from('venues')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('place_id', opts.placeId)
      .maybeSingle();
    if (lookupError) console.error('[findOrCreateVenue] lookup', lookupError.message);
    if (existing?.id) return existing.id;
  }

  const { data, error } = await supabase
    .from('venues')
    .insert({
      owner_id: ownerId,
      name: opts.name,
      address: opts.address,
      reference: opts.reference,
      district_id: opts.districtId,
      place_id: opts.placeId,
      lat: opts.lat,
      lng: opts.lng,
    })
    .select('id')
    .single();
  if (error) { console.error('[findOrCreateVenue] insert', error.message); return null; }
  return data?.id ?? null;
}

export async function insertClassStyles(supabase: SupabaseClient, classId: string, styleId: number | null): Promise<void> {
  if (!styleId) return;
  await supabase.from('class_styles').insert({ class_id: classId, style_id: styleId, is_main: true });
}

export async function insertClassSchedules(supabase: SupabaseClient, classId: string, slots: FormSlot[]): Promise<void> {
  const rows = slots.flatMap(slot =>
    slot.days
      .filter(day => DAY_MAP[day] !== undefined)
      .map(day => ({ class_id: classId, day_of_week: DAY_MAP[day], start_time: slot.startTime, end_time: slot.endTime }))
  );
  if (rows.length) await supabase.from('class_schedules').insert(rows);
}

// Returns the ~22 columns shared between createClass and updateClassFromForm.
// Callers add their specific fields (teacher_id, cover_image, published_at).
export function buildClassColumns(
  formData: FormData,
  { levelId, venueId }: { levelId: number | null; venueId: string | null }
): ClassUpdatePayload {
  const toBring  = formData.get('toBring') as string;
  const maxSpots = formData.get('maxSpots') as string | null;

  return {
    type:              formData.get('type') as ClassType,
    title:             formData.get('title') as string,
    level_id:          levelId,
    venue_id:          venueId,
    short_description: (formData.get('shortDesc') as string) || null,
    full_description:  (formData.get('fullDesc') as string) || null,
    start_date:        (formData.get('startDate') as string) || null,
    end_date:          (formData.get('endDate') as string) || null,
    price_type:        formData.get('priceType') as PriceType,
    price:             parseFloat(formData.get('price') as string) || 0,
    offer_price:       formData.get('offerPrice') ? parseFloat(formData.get('offerPrice') as string) : null,
    currency:          (formData.get('currency') as string) || 'PEN',
    max_spots:         maxSpots ? parseInt(maxSpots) : null,
    available_spots:   maxSpots ? parseInt(maxSpots) : null,
    modality:          formData.get('modality') as Modality,
    platform:          (formData.get('platform') as string) || null,
    access_link:       (formData.get('accessLink') as string) || null,
    footwear:          (formData.get('footwear') as string) || null,
    clothing:          (formData.get('clothing') as string) || null,
    requirements:      (formData.get('prerequisites') as string) || null,
    age_group:         (formData.get('ageGroup') as string) || null,
    to_bring:          toBring ? JSON.parse(toBring) : [],
    contact_mode:      ((formData.get('contactMode') as string) || 'whatsapp') as 'whatsapp' | 'instagram' | 'both',
    status:            formData.get('status') as ClassStatus,
  };
}
