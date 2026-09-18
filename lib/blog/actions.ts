'use server';
import { revalidatePath } from 'next/cache';
import { safeRevalidateTag } from '@/lib/cache';
import { createClient } from '@/lib/supabase/server';
import { fetchIsAdmin } from '@/lib/admin/queries';
import { fetchPostById } from './queries';
import type { BlogPostFormPayload, BlogActionResult } from './types';

// Cada mutación re-chequea fetchIsAdmin() ella misma — igual que
// createUserAsAdmin/approveAcademiaRequest en lib/admin/actions.ts: un
// Server Action es un endpoint direccionable por cualquiera que conozca su
// id, el guard de la UI (app/dashboard/admin/layout.tsx) no alcanza solo.
async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  if (!(await fetchIsAdmin())) throw new Error('No autorizado');
  return { supabase, user };
}

function revalidateBlog(slug?: string) {
  revalidatePath('/blog');
  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath('/dashboard/admin/blog');
  safeRevalidateTag('blog');
}

export async function createPost(payload: BlogPostFormPayload): Promise<BlogActionResult> {
  const { supabase, user } = await assertAdmin();

  if (!payload.title.trim()) {
    return { ok: false, error: 'El título es obligatorio.' };
  }

  // Un post publicado directamente nunca se queda con una fecha programada
  // colgada — si el admin apuró la publicación en vez de esperar la fecha,
  // esa fecha ya no significa nada.
  const scheduledAt = payload.status === 'published' ? null : (payload.scheduledAt || null);

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      slug: payload.slug.trim() || null,
      title: payload.title.trim(),
      excerpt: payload.excerpt.trim() || null,
      content: payload.content,
      cover_image: payload.coverImage || null,
      category: payload.category.trim() || null,
      accent_color: payload.accentColor || null,
      is_featured: payload.isFeatured,
      status: payload.status,
      author_id: user.id,
      published_at: payload.status === 'published' ? new Date().toISOString() : null,
      scheduled_at: scheduledAt,
      meta_title: payload.metaTitle.trim() || null,
      meta_description: payload.metaDescription.trim() || null,
    })
    .select('id, slug')
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? 'No se pudo crear el post.' };

  revalidateBlog(data.slug ?? undefined);
  return { ok: true, id: data.id, slug: data.slug ?? undefined };
}

export async function updatePost(id: string, payload: BlogPostFormPayload): Promise<BlogActionResult> {
  await assertAdmin();
  const supabase = await createClient();

  if (!payload.title.trim()) {
    return { ok: false, error: 'El título es obligatorio.' };
  }

  // published_at se fija la primera vez que pasa a 'published' — republicar
  // (editar un post ya publicado) no debe reiniciar su fecha de publicación.
  const existing = await fetchPostById(id);
  const isNewlyPublished = payload.status === 'published' && existing?.status !== 'published';
  const scheduledAt = payload.status === 'published' ? null : (payload.scheduledAt || null);

  const { data, error } = await supabase
    .from('blog_posts')
    .update({
      slug: payload.slug.trim() || null,
      title: payload.title.trim(),
      excerpt: payload.excerpt.trim() || null,
      content: payload.content,
      cover_image: payload.coverImage || null,
      category: payload.category.trim() || null,
      accent_color: payload.accentColor || null,
      is_featured: payload.isFeatured,
      status: payload.status,
      ...(isNewlyPublished && { published_at: new Date().toISOString() }),
      scheduled_at: scheduledAt,
      meta_title: payload.metaTitle.trim() || null,
      meta_description: payload.metaDescription.trim() || null,
    })
    .eq('id', id)
    .select('id, slug')
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? 'No se pudo actualizar el post.' };

  revalidateBlog(existing?.slug);
  revalidateBlog(data.slug ?? undefined);
  return { ok: true, id: data.id, slug: data.slug ?? undefined };
}

export async function deletePost(id: string): Promise<void> {
  await assertAdmin();
  const supabase = await createClient();
  const existing = await fetchPostById(id);

  const { error } = await supabase.from('blog_posts').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidateBlog(existing?.slug);
}

export async function setPostStatus(id: string, status: 'draft' | 'published'): Promise<void> {
  await assertAdmin();
  const supabase = await createClient();
  const existing = await fetchPostById(id);
  const isNewlyPublished = status === 'published' && existing?.status !== 'published';

  const { error } = await supabase
    .from('blog_posts')
    .update({
      status,
      ...(isNewlyPublished && { published_at: new Date().toISOString() }),
    })
    .eq('id', id);
  if (error) throw new Error(error.message);

  revalidateBlog(existing?.slug);
}
