// Server-only, a propósito SIN 'use server' — esto usa el cliente
// service-role (createAdminClient), que salta RLS por completo. Si viviera
// en lib/blog/actions.ts (que sí tiene 'use server'), Next.js expondría
// esta función como un Server Action invocable desde el cliente sin ningún
// chequeo de auth propio — a diferencia de las mutaciones de actions.ts,
// que sí son Server Actions y por eso cada una revalida is_admin() ella
// misma (ver el comentario de assertAdmin() ahí). El único caller pensado
// acá es app/api/cron/publish-scheduled-posts/route.ts, que ya verifica el
// secreto de Vercel Cron antes de llamar esto.
import { revalidatePath } from 'next/cache';
import { safeRevalidateTag } from '@/lib/cache';
import { createAdminClient } from '@/lib/supabase/admin';

export async function publishDuePosts(): Promise<{ published: number }> {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('blog_posts')
    .update({ status: 'published', published_at: nowIso, scheduled_at: null })
    .eq('status', 'draft')
    .not('scheduled_at', 'is', null)
    .lte('scheduled_at', nowIso)
    .select('slug');

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  for (const row of rows) {
    revalidatePath('/blog');
    if (row.slug) revalidatePath(`/blog/${row.slug}`);
  }
  if (rows.length > 0) {
    revalidatePath('/dashboard/admin/blog');
    safeRevalidateTag('blog');
  }

  return { published: rows.length };
}
