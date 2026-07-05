'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { lookupLevelId, lookupStyleId, lookupDistrictId } from '@/lib/catalog/lookups';
import {
  createVenue, insertClassStyles, insertClassSchedules, buildClassColumns,
} from './helpers';
import type { FormSlot, ClassUpdatePayload } from './types';

export async function createClass(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const styleName = formData.get('style')    as string;
  const levelName = formData.get('level')    as string;
  const modality  = formData.get('modality') as string;
  const city      = formData.get('city')     as string;
  const district  = formData.get('district') as string;
  const address   = formData.get('address')  as string;
  const reference = formData.get('reference') as string;
  const timeSlots = formData.get('timeSlots') as string;

  const isPresencial = modality !== 'Online';

  const [levelId, styleId, districtId] = await Promise.all([
    lookupLevelId(supabase, levelName),
    lookupStyleId(supabase, styleName),
    isPresencial ? lookupDistrictId(supabase, district, city) : Promise.resolve(null),
  ]);

  let venueId: string | null = null;
  if (isPresencial && address) {
    const venueName = (formData.get('venueName') as string) || address;
    venueId = await createVenue(supabase, user.id, { name: venueName, address, reference, districtId });
  }

  const cols = buildClassColumns(formData, { levelId, venueId });

  const { data: newClass, error } = await supabase
    .from('classes')
    .insert({
      ...cols,
      teacher_id:    user.id,
      cover_image:   formData.get('coverImage') || null,
      published_at:  cols.status === 'published' ? new Date().toISOString() : null,
    })
    .select('id')
    .single();

  if (error || !newClass) {
    console.error('[createClass]', error?.code, error?.message);
    throw new Error(error?.message ?? 'Error al crear clase');
  }

  const classId = newClass.id;
  const slots: FormSlot[] = timeSlots ? JSON.parse(timeSlots) : [];
  await Promise.all([
    insertClassStyles(supabase, classId, styleId),
    insertClassSchedules(supabase, classId, slots),
  ]);

  revalidatePath('/dashboard/mis-clases');
  revalidatePath('/clases');
  redirect('/dashboard/mis-clases');
}

export async function updateClass(classId: string, updates: ClassUpdatePayload) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const payload: ClassUpdatePayload = { ...updates };
  if (payload.status === 'published' && !payload.published_at) {
    payload.published_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('classes')
    .update(payload)
    .eq('id', classId)
    .eq('teacher_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/mis-clases');
  revalidatePath(`/clases/${classId}`);
  revalidatePath('/clases');
}

export async function deleteClass(classId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', classId)
    .eq('teacher_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/mis-clases');
  revalidatePath('/clases');
}

export async function duplicateClass(classId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const [originalResult, stylesResult, schedulesResult] = await Promise.all([
    supabase.from('classes').select('*').eq('id', classId).eq('teacher_id', user.id).single(),
    supabase.from('class_styles').select('style_id, is_main').eq('class_id', classId),
    supabase.from('class_schedules').select('day_of_week, start_time, end_time').eq('class_id', classId),
  ]);

  if (originalResult.error || !originalResult.data) throw new Error('Clase no encontrada');

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, created_at, published_at, views_count, contacts_count, saved_count, slug, updated_at, ...rest } = originalResult.data;

  const { data: newClass, error: insertError } = await supabase
    .from('classes')
    .insert({ ...rest, title: `${originalResult.data.title} (copia)`, status: 'draft' })
    .select('id')
    .single();

  if (insertError || !newClass) throw new Error(insertError?.message ?? 'Error al duplicar');

  const newClassId = newClass.id;
  const styleRows  = (stylesResult.data ?? []).map(s => ({ ...s, class_id: newClassId }));
  const schedRows  = (schedulesResult.data ?? []).map(s => ({ ...s, class_id: newClassId }));

  await Promise.all([
    styleRows.length  ? supabase.from('class_styles').insert(styleRows)   : Promise.resolve(),
    schedRows.length  ? supabase.from('class_schedules').insert(schedRows) : Promise.resolve(),
  ]);

  revalidatePath('/dashboard/mis-clases');
}

export async function updateClassFromForm(classId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const styleName  = formData.get('style')     as string;
  const levelName  = formData.get('level')     as string;
  const modality   = formData.get('modality')  as string;
  const city       = formData.get('city')      as string;
  const district   = formData.get('district')  as string;
  const address    = formData.get('address')   as string;
  const reference  = formData.get('reference') as string;
  const timeSlots  = formData.get('timeSlots') as string;
  const coverImage = formData.get('coverImage') as string | null;

  const { data: existing } = await supabase
    .from('classes')
    .select('venue_id')
    .eq('id', classId)
    .eq('teacher_id', user.id)
    .single();

  if (!existing) throw new Error('Clase no encontrada');

  const isPresencial = modality !== 'Online';

  const [levelId, styleId, districtId] = await Promise.all([
    lookupLevelId(supabase, levelName),
    lookupStyleId(supabase, styleName),
    isPresencial ? lookupDistrictId(supabase, district, city) : Promise.resolve(null),
  ]);

  let venueId: string | null = existing.venue_id ?? null;
  if (isPresencial && address) {
    const venueName = (formData.get('venueName') as string) || address;
    const newVenueId = await createVenue(supabase, user.id, { name: venueName, address, reference, districtId });
    if (newVenueId) venueId = newVenueId;
  } else if (!isPresencial) {
    venueId = null;
  }

  const cols = buildClassColumns(formData, { levelId, venueId });
  const updates: ClassUpdatePayload = { ...cols };

  if (coverImage) updates.cover_image = coverImage;
  if (cols.status === 'published') updates.published_at = new Date().toISOString();

  const { error } = await supabase
    .from('classes')
    .update(updates)
    .eq('id', classId)
    .eq('teacher_id', user.id);

  if (error) {
    console.error('[updateClassFromForm]', error.message);
    throw new Error(error.message);
  }

  const slots: FormSlot[] = timeSlots ? JSON.parse(timeSlots) : [];
  await Promise.all([
    supabase.from('class_styles').delete().eq('class_id', classId),
    supabase.from('class_schedules').delete().eq('class_id', classId),
  ]);
  await Promise.all([
    insertClassStyles(supabase, classId, styleId),
    insertClassSchedules(supabase, classId, slots),
  ]);

  revalidatePath('/dashboard/mis-clases');
  revalidatePath(`/clases/${classId}`);
  revalidatePath('/clases');
  redirect('/dashboard/mis-clases');
}
