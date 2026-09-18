export type BlogPostStatus = 'draft' | 'published';

// Paleta curada del "bloque de color" de portada (referencia: The Verge, que
// le da a cada feature story un color de fondo propio) — key semántica en
// vez de hex libre, así el admin nunca puede armar una combinación de
// contraste rota. El mapeo key -> {bg,text} vive en lib/blog/helpers.ts
// (BLOG_ACCENTS), no acá — este archivo es solo el tipo del dato.
export type BlogAccentColor = 'yellow' | 'sky' | 'lilac' | 'mint' | 'coral' | 'grape' | 'ink';

// Fila cruda tal como sale de Supabase (snake_case) — lib/blog/queries.ts es
// la única dueña del mapeo a BlogPost (camelCase), mismo split que
// lib/classes/types.ts (DbClassRow) / lib/classes/queries.ts.
export interface DbBlogPost {
  id: string;
  slug: string | null;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  cover_image_position: string | null;
  category: string | null;
  accent_color: string | null;
  status: string;
  author_id: string | null;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  cta_label: string | null;
  cta_href: string | null;
  cta_image: string | null;
  views_count: number;
  created_at: string;
  updated_at: string;
  author?: { name: string } | null;
}

// Tipo de dominio (camelCase) — lo que consume el resto de la app.
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  coverImagePosition: string;
  category?: string;
  accentColor?: BlogAccentColor;
  status: BlogPostStatus;
  authorName?: string;
  publishedAt?: string;
  metaTitle?: string;
  metaDescription?: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaImage?: string;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
}

// Payload de un Server Action de crear/editar — llega tipado desde el
// formulario, no como FormData (a diferencia de Crear Clase, un post no
// tiene el armado de venue/schedules que justificaba FormData ahí).
export interface BlogPostFormPayload {
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  accentColor: BlogAccentColor | '';
  status: BlogPostStatus;
  metaTitle: string;
  metaDescription: string;
  ctaLabel: string;
  ctaHref: string;
  ctaImage: string;
}

export interface BlogActionResult {
  ok: boolean;
  error?: string;
  slug?: string;
}
