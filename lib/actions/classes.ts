'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// ── Class mutations ───────────────────────────────────────────────────────────

export async function createClass(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const status = formData.get('status') as string;
  const timeSlots = formData.get('timeSlots') as string;
  const toBring   = formData.get('toBring')   as string;

  const { error } = await supabase.from('classes').insert({
    teacher_id:       user.id,
    type:             formData.get('type'),
    title:            formData.get('title'),
    style:            formData.get('style'),
    level:            formData.get('level'),
    short_description: formData.get('shortDesc'),
    full_description:  formData.get('fullDesc'),
    start_date:       formData.get('startDate') || null,
    end_date:         formData.get('endDate')   || null,
    time_slots:       timeSlots ? JSON.parse(timeSlots) : [],
    price_type:       formData.get('priceType'),
    price:            parseFloat(formData.get('price') as string) || 0,
    offer_price:      formData.get('offerPrice') ? parseFloat(formData.get('offerPrice') as string) : null,
    currency:         formData.get('currency') || 'PEN',
    max_spots:        formData.get('maxSpots') ? parseInt(formData.get('maxSpots') as string) : null,
    available_spots:  formData.get('maxSpots') ? parseInt(formData.get('maxSpots') as string) : null,
    modality:         formData.get('modality'),
    city:             formData.get('city'),
    district:         formData.get('district'),
    address:          formData.get('address'),
    reference:        formData.get('reference'),
    footwear:         formData.get('footwear'),
    clothing:         formData.get('clothing'),
    prerequisites:    formData.get('prerequisites'),
    age_group:        formData.get('ageGroup'),
    to_bring:         toBring ? JSON.parse(toBring) : [],
    contact_mode:     formData.get('contactMode') || 'whatsapp',
    cover_image:      formData.get('coverImage') || null,
    status,
    published_at:     status === 'published' ? new Date().toISOString() : null,
  });

  if (error) {
    console.error('[createClass]', error.code, error.message);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/mis-clases');
  revalidatePath('/clases');
  redirect('/dashboard/mis-clases');
}

export async function updateClass(
  classId: string,
  updates: Record<string, unknown>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  if (updates.status === 'published' && !updates.published_at) {
    updates.published_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('classes')
    .update(updates)
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

  const { data: original, error: fetchError } = await supabase
    .from('classes')
    .select('*')
    .eq('id', classId)
    .eq('teacher_id', user.id)
    .single();

  if (fetchError || !original) throw new Error('Clase no encontrada');

  const { id, created_at, published_at, views, contacts, saved_count, ...rest } = original;
  void id; void created_at; void published_at; void views; void contacts; void saved_count;

  const { error: insertError } = await supabase.from('classes').insert({
    ...rest,
    title: `${original.title} (copia)`,
    status: 'draft',
    views: 0,
    contacts: 0,
    saved_count: 0,
  });

  if (insertError) throw new Error(insertError.message);

  revalidatePath('/dashboard/mis-clases');
}

export async function updateClassFromForm(classId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const status = formData.get('status') as string;
  const timeSlots = formData.get('timeSlots') as string;
  const toBring   = formData.get('toBring')   as string;
  const coverImage = formData.get('coverImage') as string | null;

  const updates: Record<string, unknown> = {
    type:             formData.get('type'),
    title:            formData.get('title'),
    style:            formData.get('style'),
    level:            formData.get('level'),
    short_description: formData.get('shortDesc'),
    full_description:  formData.get('fullDesc'),
    start_date:       formData.get('startDate') || null,
    end_date:         formData.get('endDate')   || null,
    time_slots:       timeSlots ? JSON.parse(timeSlots) : [],
    price_type:       formData.get('priceType'),
    price:            parseFloat(formData.get('price') as string) || 0,
    offer_price:      formData.get('offerPrice') ? parseFloat(formData.get('offerPrice') as string) : null,
    currency:         formData.get('currency') || 'PEN',
    max_spots:        formData.get('maxSpots') ? parseInt(formData.get('maxSpots') as string) : null,
    available_spots:  formData.get('maxSpots') ? parseInt(formData.get('maxSpots') as string) : null,
    modality:         formData.get('modality'),
    city:             formData.get('city'),
    district:         formData.get('district'),
    address:          formData.get('address'),
    reference:        formData.get('reference'),
    footwear:         formData.get('footwear'),
    clothing:         formData.get('clothing'),
    prerequisites:    formData.get('prerequisites'),
    age_group:        formData.get('ageGroup'),
    to_bring:         toBring ? JSON.parse(toBring) : [],
    contact_mode:     formData.get('contactMode') || 'whatsapp',
    status,
    updated_at:       new Date().toISOString(),
  };

  if (coverImage) updates.cover_image = coverImage;
  if (status === 'published') updates.published_at = new Date().toISOString();

  const { error } = await supabase
    .from('classes')
    .update(updates)
    .eq('id', classId)
    .eq('teacher_id', user.id);

  if (error) {
    console.error('[updateClassFromForm]', error.code, error.message);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/mis-clases');
  revalidatePath(`/clases/${classId}`);
  revalidatePath('/clases');
  redirect('/dashboard/mis-clases');
}

// ── Profile mutations ─────────────────────────────────────────────────────────

export async function updateProfile(updates: {
  name?: string;
  bio?: string;
  city?: string;
  district?: string;
  years_experience?: number;
  whatsapp?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  website?: string;
  dance_styles?: string[];
  photo_url?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/perfil');
  revalidatePath('/dashboard');
}
