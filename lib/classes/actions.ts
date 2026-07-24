'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { lookupLevelId, lookupStyleId } from '@/lib/catalog/lookups';
import {
  findOrCreateVenue, venueNeedsUpdate, insertClassStyles, insertClassSchedules, buildClassColumns,
} from './helpers';
import {
  validateForPublish, formDataToValidationInput, dbRowToValidationInput, publishError,
} from './validation';
import { assertContactChannel } from './publishGuard';
import { CLASS_SELECT } from './queries';
import type { FormSlot, ClassUpdatePayload, DbClassRow } from './types';

export async function createClass(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  if (formData.get('status') === 'published') {
    const result = validateForPublish(formDataToValidationInput(formData));
    if (!result.ok) {
      throw publishError({ code: 'VALIDATION', message: 'Completa los campos obligatorios antes de publicar.', errors: result.errors });
    }
  }

  const styleName = formData.get('style')    as string;
  const levelName = formData.get('level')    as string;
  const modality  = formData.get('modality') as string;
  const city      = formData.get('city')     as string;
  const district  = formData.get('district') as string;
  const address   = formData.get('address')  as string;
  const reference = formData.get('reference') as string;
  const timeSlots = formData.get('timeSlots') as string;
  const placeId   = (formData.get('placeId') as string) || null;
  const lat       = parseFloat(formData.get('lat') as string) || null;
  const lng       = parseFloat(formData.get('lng') as string) || null;

  const isPresencial = modality !== 'Online';

  const [levelId, styleId] = await Promise.all([
    lookupLevelId(supabase, levelName),
    lookupStyleId(supabase, styleName),
  ]);

  let venueId: string | null = null;
  if (isPresencial && address) {
    // No fallback to `address` here: the detail page shows venue name and
    // address as separate lines, so defaulting an unnamed venue's name to
    // its own address made that block print the address twice.
    const venueName = (formData.get('venueName') as string) || '';
    venueId = await findOrCreateVenue(supabase, user.id, { name: venueName, address, reference, city, district, placeId, lat, lng });
  }

  const cols = buildClassColumns(formData, { levelId, venueId });

  if (cols.status === 'published') {
    await assertContactChannel(supabase, user.id, cols.contact_mode ?? 'whatsapp');
  }

  const { data: newClass, error } = await supabase
    .from('classes')
    .insert({
      ...cols,
      teacher_id:    user.id,
      cover_image:   formData.get('coverImage') || null,
      cover_image_position: (formData.get('coverImagePosition') as string) || '50% 50%',
      cover_image_zoom: formData.get('coverImageZoom') ? parseFloat(formData.get('coverImageZoom') as string) : 1,
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
  try {
    await Promise.all([
      insertClassStyles(supabase, classId, styleId),
      insertClassSchedules(supabase, classId, slots, cols.start_date),
    ]);
  } catch (err) {
    // Roll back the orphaned class row rather than leaving a published/draft
    // class with no style or schedule attached.
    await supabase.from('classes').delete().eq('id', classId);
    throw err;
  }

  revalidatePath('/dashboard/mis-clases');
  revalidatePath('/clases');
  redirect(cols.status === 'published' ? '/dashboard/mis-clases?published=1' : '/dashboard/mis-clases');
}

export async function updateClass(classId: string, updates: ClassUpdatePayload) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const payload: ClassUpdatePayload = { ...updates };

  // Publish strictness parity (Addition B): the list-view "Publicar"/"Activar"
  // path bypasses the wizard's form entirely, so it must independently fetch
  // the stored row + schedules and run the SAME validate+guard pipeline the
  // wizard runs. Non-published transitions (draft/archived) stay permissive.
  if (payload.status === 'published') {
    const { data: row } = await supabase
      .from('classes')
      .select(CLASS_SELECT)
      .eq('id', classId)
      .eq('teacher_id', user.id)
      .single();

    if (!row) throw new Error('Clase no encontrada');

    const typedRow = row as unknown as DbClassRow;
    const result = validateForPublish(dbRowToValidationInput(typedRow, typedRow.class_schedules ?? []));
    if (!result.ok) {
      throw publishError({ code: 'VALIDATION', message: 'Completa los campos obligatorios antes de publicar.', errors: result.errors });
    }

    await assertContactChannel(supabase, user.id, typedRow.contact_mode ?? 'whatsapp');

    if (!payload.published_at) payload.published_at = new Date().toISOString();
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

  if (formData.get('status') === 'published') {
    const result = validateForPublish(formDataToValidationInput(formData));
    if (!result.ok) {
      throw publishError({ code: 'VALIDATION', message: 'Completa los campos obligatorios antes de publicar.', errors: result.errors });
    }
  }

  const styleName  = formData.get('style')     as string;
  const levelName  = formData.get('level')     as string;
  const modality   = formData.get('modality')  as string;
  const city       = formData.get('city')      as string;
  const district   = formData.get('district')  as string;
  const address    = formData.get('address')   as string;
  const reference  = formData.get('reference') as string;
  const timeSlots  = formData.get('timeSlots') as string;
  const coverImage = formData.get('coverImage') as string | null;
  const placeId    = (formData.get('placeId') as string) || null;
  const lat        = parseFloat(formData.get('lat') as string) || null;
  const lng        = parseFloat(formData.get('lng') as string) || null;

  const { data: existing } = await supabase
    .from('classes')
    .select('venue_id, venues(place_id, address, name, city, district)')
    .eq('id', classId)
    .eq('teacher_id', user.id)
    .single();

  if (!existing) throw new Error('Clase no encontrada');

  const isPresencial = modality !== 'Online';

  const [levelId, styleId] = await Promise.all([
    lookupLevelId(supabase, levelName),
    lookupStyleId(supabase, styleName),
  ]);

  // `venues` is a to-one FK relation, but PostgREST types it as an array when
  // inferred loosely — normalize before reading.
  const currentVenueRaw = existing.venues as { place_id: string | null; address: string | null; name: string | null; city: string | null; district: string | null } | Array<{ place_id: string | null; address: string | null; name: string | null; city: string | null; district: string | null }> | null;
  const currentVenue = Array.isArray(currentVenueRaw) ? (currentVenueRaw[0] ?? null) : currentVenueRaw;

  let venueId: string | null = existing.venue_id ?? null;
  if (isPresencial && address) {
    // See createClass: no fallback to `address` — an unnamed venue should
    // stay unnamed, not silently mirror the address into the name field.
    const venueName = (formData.get('venueName') as string) || '';
    if (venueNeedsUpdate(currentVenue, { placeId, address, name: venueName, city, district })) {
      const newVenueId = await findOrCreateVenue(supabase, user.id, { name: venueName, address, reference, city, district, placeId, lat, lng });
      if (newVenueId) venueId = newVenueId;
    }
  } else if (!isPresencial) {
    venueId = null;
  }

  const cols = buildClassColumns(formData, { levelId, venueId });
  const updates: ClassUpdatePayload = { ...cols };

  if (cols.status === 'published') {
    await assertContactChannel(supabase, user.id, cols.contact_mode ?? 'whatsapp');
  }

  if (coverImage) {
    updates.cover_image = coverImage;
    updates.cover_image_position = (formData.get('coverImagePosition') as string) || '50% 50%';
    updates.cover_image_zoom = formData.get('coverImageZoom') ? parseFloat(formData.get('coverImageZoom') as string) : 1;
  }
  if (cols.status === 'published') updates.published_at = new Date().toISOString();

  // Style/schedule writes run BEFORE the `classes` update, not after: they're
  // the step most likely to fail (e.g. a UNIQUE violation from overlapping
  // slots), and doing the riskier work first means a failure here leaves the
  // `classes` row completely untouched — no partial save, nothing to roll
  // back. (createClass has an explicit rollback for the same reason; here we
  // just avoid ever needing one.)

  // Capture the old rows' ids before writing the new ones, so if the new
  // insert fails we throw with the previous style/schedule still intact
  // instead of losing them to a delete that already committed.
  const [{ data: oldStyleRows }, { data: oldScheduleRows }] = await Promise.all([
    supabase.from('class_styles').select('id, style_id').eq('class_id', classId),
    supabase.from('class_schedules').select('id, day_of_week, start_time, end_time').eq('class_id', classId),
  ]);

  const slots: FormSlot[] = timeSlots ? JSON.parse(timeSlots) : [];
  const [, newScheduleKeys] = await Promise.all([
    insertClassStyles(supabase, classId, styleId),
    insertClassSchedules(supabase, classId, slots, cols.start_date),
  ]);

  // insertClassStyles/insertClassSchedules upsert on their unique columns, so
  // a row matching a still-current style/slot was updated in place, not
  // duplicated — only truly stale rows from before this edit need deleting.
  const oldStyleIds = (oldStyleRows ?? []).filter(r => r.style_id !== styleId).map(r => r.id);
  const newScheduleKeySet = new Set(newScheduleKeys.map(k => `${k.day_of_week}|${k.start_time}|${k.end_time}`));
  const oldScheduleIds = (oldScheduleRows ?? [])
    .filter(r => !newScheduleKeySet.has(`${r.day_of_week}|${r.start_time}|${r.end_time}`))
    .map(r => r.id);
  await Promise.all([
    oldStyleIds.length ? supabase.from('class_styles').delete().in('id', oldStyleIds) : Promise.resolve(),
    oldScheduleIds.length ? supabase.from('class_schedules').delete().in('id', oldScheduleIds) : Promise.resolve(),
  ]);

  const { error } = await supabase
    .from('classes')
    .update(updates)
    .eq('id', classId)
    .eq('teacher_id', user.id);

  if (error) {
    console.error('[updateClassFromForm]', error.message);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/mis-clases');
  revalidatePath(`/clases/${classId}`);
  revalidatePath('/clases');
  redirect(cols.status === 'published' ? '/dashboard/mis-clases?published=1' : '/dashboard/mis-clases');
}
