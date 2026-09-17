'use server';
import { createClient } from '@/lib/supabase/server';
import { fetchIsAdmin } from '@/lib/admin/queries';
import { validateImageFile, type AllowedImageMime } from '@/lib/classes/imageValidation';
import { imageUploadRateLimiter, checkRateLimit } from '@/lib/ratelimit';

// validateImageFile es genérica (sin acoplamiento a clases) — se reusa tal
// cual desde lib/classes/imageValidation.ts, solo cambia el bucket acá.
const EXT_BY_MIME: Record<AllowedImageMime, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export async function uploadBlogImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };
  if (!(await fetchIsAdmin())) return { error: 'No autorizado' };

  const { success } = await checkRateLimit(imageUploadRateLimiter, user.id);
  if (!success) {
    return { error: 'Has superado el límite de subida de imágenes (máx. 15 por hora). Por favor intenta más tarde.' };
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { error: 'No se recibió ningún archivo.' };
  }

  const buf = new Uint8Array(await file.arrayBuffer());
  const result = validateImageFile({ type: file.type, size: file.size, head: buf.subarray(0, 16), full: buf });
  if (!result.ok) {
    return { error: result.errors[0].message };
  }

  const ext = EXT_BY_MIME[file.type as AllowedImageMime];
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage.from('blog-images').upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false,
  });
  if (uploadErr) return { error: uploadErr.message };

  const { data: { publicUrl } } = supabase.storage.from('blog-images').getPublicUrl(path);
  return { url: publicUrl };
}
