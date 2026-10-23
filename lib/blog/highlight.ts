// lib/blog/highlight.ts
//
// Lo mínimo del último artículo del blog que necesita la tarjeta del Home
// (se serializa al Client Component, por eso no se pasa el post completo con su contenido).
import type { BlogPost } from './types';
import { pickFeaturedPost } from './helpers';

export interface BlogHighlight {
  slug: string;
  title: string;
  excerpt: string;
  coverImage?: string;
  coverImagePosition: string;
  category?: string;
}

/** Recibe los artículos publicados, del más reciente al más antiguo (como fetchPublishedPosts).
 *  Elige el marcado «Destacado» en el admin del blog (el más reciente entre ellos) y, si no hay
 *  ninguno, el más reciente — el mismo criterio que la tarjeta grande de /blog. */
export function toBlogHighlight(posts: BlogPost[]): BlogHighlight | null {
  const latest = pickFeaturedPost(posts);
  if (!latest || !latest.slug || !latest.title.trim()) return null;
  return {
    slug: latest.slug,
    title: latest.title,
    excerpt: latest.excerpt,
    coverImage: latest.coverImage,
    coverImagePosition: latest.coverImagePosition,
    category: latest.category,
  };
}
