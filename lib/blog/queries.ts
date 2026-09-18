import { createClient } from '@/lib/supabase/server';
import { getPublicClient } from '@/lib/supabase/public';
import { safeCache } from '@/lib/cache';
import { getBlogAccent } from './helpers';
import type { BlogPost, DbBlogPost } from './types';

const POST_SELECT = `
  id, slug, title, excerpt, content, cover_image, cover_image_position, category,
  accent_color, is_featured, status, author_id, published_at, scheduled_at,
  meta_title, meta_description,
  cta_label, cta_href, cta_image, views_count, created_at, updated_at,
  author:profiles!author_id(name)
`;

function mapPost(row: DbBlogPost): BlogPost {
  return {
    id: row.id,
    slug: row.slug ?? row.id,
    title: row.title,
    excerpt: row.excerpt ?? '',
    content: row.content,
    coverImage: row.cover_image ?? undefined,
    coverImagePosition: row.cover_image_position || '50% 50%',
    category: row.category ?? undefined,
    // getBlogAccent() valida contra la paleta curada — si accent_color
    // guardara una key vieja/inválida (paleta que cambió), cae a "sin
    // color" en vez de romper el render con una key que no existe.
    accentColor: getBlogAccent(row.accent_color)?.key,
    isFeatured: row.is_featured,
    status: row.status === 'published' ? 'published' : 'draft',
    authorName: row.author?.name ?? undefined,
    publishedAt: row.published_at ?? undefined,
    scheduledAt: row.scheduled_at ?? undefined,
    metaTitle: row.meta_title ?? undefined,
    metaDescription: row.meta_description ?? undefined,
    ctaLabel: row.cta_label ?? undefined,
    ctaHref: row.cta_href ?? undefined,
    ctaImage: row.cta_image ?? undefined,
    viewsCount: row.views_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Público — usado por /blog. Cacheado como el resto del catálogo público
// (fetchPublishedClasses, fetchFeaturedProfiles): mismo revalidate/tag para
// que safeRevalidateTag('blog') funcione igual que 'classes'/'profiles'.
async function queryPublishedPosts(category?: string): Promise<BlogPost[]> {
  const supabase = getPublicClient();
  let query = supabase
    .from('blog_posts')
    .select(POST_SELECT)
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) {
    console.error('fetchPublishedPosts error:', error.message);
    return [];
  }
  return (data ?? []).map(row => mapPost(row as unknown as DbBlogPost));
}

export const fetchPublishedPosts = safeCache(
  queryPublishedPosts,
  ['published_blog_posts'],
  { revalidate: 300, tags: ['blog'] }
);

async function queryPostBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select(POST_SELECT)
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  if (error || !data) return null;
  return mapPost(data as unknown as DbBlogPost);
}

export const fetchPostBySlug = safeCache(
  queryPostBySlug,
  ['blog_post_by_slug'],
  { revalidate: 300, tags: ['blog'] }
);

// Vista previa de un borrador — a diferencia de fetchPostBySlug() (cliente
// público, filtra status='published', cacheado), usa el cliente autenticado
// y no filtra por status. No hace falta chequear is_admin acá: las policies
// de RLS (blog_posts_admin_read) ya hacen exactamente eso — un no-admin que
// llame esto recibe null igual que si el post no existiera, así que el
// caller (app/blog/[slug]/page.tsx) no necesita su propio guard. Sin
// safeCache a propósito: el estado de un borrador cambia seguido mientras
// se edita, y es por-usuario (RLS), no cacheable entre visitantes.
export async function fetchPostBySlugAny(slug: string): Promise<BlogPost | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select(POST_SELECT)
    .eq('slug', slug)
    .single();
  if (error || !data) return null;
  return mapPost(data as unknown as DbBlogPost);
}

// Panel de admin — todos los status, siempre fresco (sin safeCache: el
// autor necesita ver su propio borrador recién guardado sin esperar TTL).
export async function fetchAllPostsForAdmin(): Promise<BlogPost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select(POST_SELECT)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetchAllPostsForAdmin error:', error.message);
    return [];
  }
  return (data ?? []).map(row => mapPost(row as unknown as DbBlogPost));
}

export async function fetchPostById(id: string): Promise<BlogPost | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select(POST_SELECT)
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return mapPost(data as unknown as DbBlogPost);
}

// Categorías distintas entre los posts publicados — para el filtro de /blog.
export async function fetchBlogCategories(): Promise<string[]> {
  const posts = await fetchPublishedPosts();
  return [...new Set(posts.map(p => p.category).filter((c): c is string => Boolean(c)))].sort();
}

// Para el selector de categoría del editor de admin — a diferencia de
// fetchBlogCategories(), incluye borradores: antes de publicar por primera
// vez, un admin no tenía ninguna sugerencia de qué categorías ya existen
// (todas venían de posts publicados), así que terminaba escribiendo
// variantes sueltas ("Guías" vs "guia") sin saberlo.
export async function fetchAllBlogCategories(): Promise<string[]> {
  const posts = await fetchAllPostsForAdmin();
  return [...new Set(posts.map(p => p.category).filter((c): c is string => Boolean(c)))].sort();
}

// "Leé también" al pie de un post — misma categoría primero (relevancia real
// para el lector), rellenando con los más recientes de otras categorías si
// no hay suficientes. Bueno para SEO (enlazado interno) y para retener al
// lector en el sitio en vez de que rebote después de un solo post.
export async function fetchRelatedPosts(current: BlogPost, limit = 3): Promise<BlogPost[]> {
  const all = await fetchPublishedPosts();
  const others = all.filter(p => p.id !== current.id);
  const sameCategory = current.category ? others.filter(p => p.category === current.category) : [];
  const rest = others.filter(p => !sameCategory.includes(p));
  return [...sameCategory, ...rest].slice(0, limit);
}
