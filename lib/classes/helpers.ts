import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClassStatus, ClassType, PriceType, Modality } from '@/lib/types';
import type { FormSlot, ClassUpdatePayload } from './types';

// day_of_week: 0 = Lunes ... 6 = Domingo (ISO/Peru convention)
export const DAY_MAP: Record<string, number> = {
  'Lunes': 0, 'Martes': 1, 'Miércoles': 2, 'Jueves': 3,
  'Viernes': 4, 'Sábado': 5, 'Domingo': 6,
};

export function venueNeedsUpdate(
  current: { place_id: string | null; address: string | null; name: string | null } | null,
  incoming: { placeId: string | null; address: string; name: string }
): boolean {
  if (!current) return true;
  if (current.name !== incoming.name) return true;
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
    if (existing?.id) {
      // Venues are reused across classes at the same place (see table
      // comment), so keep the shared row's editable fields in sync with
      // whatever the teacher just typed instead of leaving them frozen at
      // whatever they were the first time this place was saved.
      const { error: updateError } = await supabase
        .from('venues')
        .update({ name: opts.name, reference: opts.reference, district_id: opts.districtId, lat: opts.lat, lng: opts.lng })
        .eq('id', existing.id);
      if (updateError) console.error('[findOrCreateVenue] update', updateError.message);
      return existing.id;
    }
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
  // Upsert, not insert: class_styles has PRIMARY KEY (class_id, style_id), so
  // editing a class without changing its style would otherwise violate that
  // key on every save — aborting the update before it reaches the schedule
  // cleanup step below and leaking a duplicate class_schedules row per retry.
  const { error } = await supabase
    .from('class_styles')
    .upsert({ class_id: classId, style_id: styleId, is_main: true }, { onConflict: 'class_id,style_id' });
  if (error) throw new Error(`No se pudo guardar el estilo de la clase: ${error.message}`);
}

export async function insertClassSchedules(
  supabase: SupabaseClient, classId: string, slots: FormSlot[], startDate?: string | null
): Promise<{ day_of_week: number; start_time: string; end_time: string }[]> {
  // "Clase única" slots carry no `days` (single date, not a weekly recurrence) —
  // derive day_of_week from startDate so the schedule row still gets written.
  const fallbackDay = startDate ? (new Date(`${startDate}T12:00:00`).getDay() + 6) % 7 : null;

  const rows = slots.flatMap(slot => {
    if (slot.days.length === 0) {
      return fallbackDay !== null
        ? [{ class_id: classId, day_of_week: fallbackDay, start_time: slot.startTime, end_time: slot.endTime }]
        : [];
    }
    return slot.days
      .filter(day => DAY_MAP[day] !== undefined)
      .map(day => ({ class_id: classId, day_of_week: DAY_MAP[day], start_time: slot.startTime, end_time: slot.endTime }));
  });
  if (rows.length) {
    // Upsert, not insert: class_schedules has a UNIQUE(class_id, day_of_week,
    // start_time, end_time) constraint, so re-saving a class without changing
    // its schedule would otherwise collide with the still-present old row
    // (the stale-row cleanup below runs after this, not before).
    const { error } = await supabase
      .from('class_schedules')
      .upsert(rows, { onConflict: 'class_id,day_of_week,start_time,end_time' });
    if (error) throw new Error(`No se pudo guardar el horario de la clase: ${error.message}`);
  }
  return rows.map(({ day_of_week, start_time, end_time }) => ({ day_of_week, start_time, end_time }));
}

// Returns the ~22 columns shared between createClass and updateClassFromForm.
// Callers add their specific fields (teacher_id, cover_image, published_at).
export function buildClassColumns(
  formData: FormData,
  { levelId, venueId }: { levelId: number | null; venueId: string | null }
): ClassUpdatePayload {
  const toBring      = formData.get('toBring') as string;
  const maxSpots     = formData.get('maxSpots') as string | null;
  const footwear     = formData.get('footwear') as string | null;
  const prerequisites = formData.get('prerequisites') as string | null;

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
    footwear:          footwear ? JSON.parse(footwear) : [],
    requirements:      prerequisites ? JSON.parse(prerequisites) : [],
    clothing:          (formData.get('clothing') as string) || null,
    age_group:         (formData.get('ageGroup') as string) || null,
    to_bring:          toBring ? JSON.parse(toBring) : [],
    contact_mode:      ((formData.get('contactMode') as string) || 'whatsapp') as 'whatsapp' | 'instagram' | 'both',
    status:            formData.get('status') as ClassStatus,
  };
}
