'use server';
import { createClient } from '@/lib/supabase/server';
import { assertRole } from '@/lib/auth/assertRole';
import { validateImageFile, type AllowedImageMime } from '@/lib/classes/imageValidation';

// Same defense-in-depth as lib/classes/imageActions.ts's uploadClassImage —
// profile photo/cover uploads (onboarding, convertir-academia) went straight
// from the browser to Storage with only a client-side size check: no MIME/
// magic-byte validation and no role gate, unlike class images. That let any
// authenticated user (including alumno) upload arbitrary bytes — e.g. an SVG
// with an embedded <script>, served publicly from a public bucket.

const EXT_BY_MIME: Record<AllowedImageMime, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export async function uploadProfileImage(formData: FormData, suffix: 'photo' | 'cover'): Promise<{ url: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  await assertRole(supabase, user.id, ['profesor', 'academia']);

  const file = formData.get('file');
  if (!(file instanceof File)) throw new Error('No se recibió ningún archivo.');

  const buf = new Uint8Array(await file.arrayBuffer());
  const result = validateImageFile({ type: file.type, size: file.size, head: buf.subarray(0, 16), full: buf });
  if (!result.ok) throw new Error(result.errors[0].message);

  // Path prefix from the authenticated user.id, never client input — see
  // uploadClassImage's identical reasoning.
  const ext = EXT_BY_MIME[file.type as AllowedImageMime];
  const path = `${user.id}/${Date.now()}-${suffix}.${ext}`;

  const { error: uploadErr } = await supabase.storage.from('class-images').upload(path, file);
  if (uploadErr) throw new Error(uploadErr.message);

  const { data: { publicUrl } } = supabase.storage.from('class-images').getPublicUrl(path);
  return { url: publicUrl };
}
