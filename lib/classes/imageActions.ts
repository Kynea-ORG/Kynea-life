'use server';
import { createClient } from '@/lib/supabase/server';
import { validateImageFile, type AllowedImageMime } from './imageValidation';
import { publishError } from './validation';

// Canonical extension per validated MIME — derived from the CHECKED mime, not
// from file.name, so a ".png"-named file with JPEG bytes still gets a ".jpg"
// path (avoids trusting the client's filename for anything beyond cosmetics).
const EXT_BY_MIME: Record<AllowedImageMime, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export async function uploadClassImage(formData: FormData): Promise<{ url: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const file = formData.get('file');
  if (!(file instanceof File)) {
    throw publishError({ code: 'INVALID_IMAGE', message: 'No se recibió ningún archivo.' });
  }

  const buf = new Uint8Array(await file.arrayBuffer());
  const result = validateImageFile({ type: file.type, size: file.size, head: buf.subarray(0, 16) });
  if (!result.ok) {
    throw publishError({ code: 'INVALID_IMAGE', message: result.errors[0].message });
  }

  // Path prefix is derived from the authenticated user.id — never from client
  // input — so a client cannot target another user's folder even if Storage
  // RLS is misconfigured.
  const ext = EXT_BY_MIME[file.type as AllowedImageMime];
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage.from('class-images').upload(path, file);
  if (uploadErr) throw new Error(uploadErr.message);

  const { data: { publicUrl } } = supabase.storage.from('class-images').getPublicUrl(path);
  return { url: publicUrl };
}
