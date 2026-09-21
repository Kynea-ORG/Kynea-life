import type { BlogAccentColor, BlogPost } from './types';

// Paleta curada del "bloque de color" de portada (referencia: The Verge).
// Cada entrada trae su propio par de texto (fuerte + tenue) ya resuelto por
// contraste — el admin elige una key, nunca un hex libre, así nunca puede
// armar una combinación ilegible. Todos los bg salen de tokens ya definidos
// en app/globals.css (@theme), ninguno es un hex nuevo.
export interface BlogAccentTheme {
  key: BlogAccentColor;
  label: string;
  swatch: string;
  bg: string;
  text: string;
  muted: string;
}

// Muted como opacidad del mismo negro/blanco fuerte (no un gris fijo
// aparte): un gris neutro suelto se ve apagado/sucio sobre un fondo
// saturado — bajar la opacidad del propio texto fuerte mantiene la misma
// familia de tono.
export const BLOG_ACCENTS: Record<BlogAccentColor, BlogAccentTheme> = {
  yellow: { key: 'yellow', label: 'Amarillo', swatch: '#FFE040', bg: 'bg-yellow',       text: 'text-neutral-900', muted: 'text-neutral-900/70' },
  sky:    { key: 'sky',    label: 'Celeste',   swatch: '#A8C8F8', bg: 'bg-blue-pastel',  text: 'text-neutral-900', muted: 'text-neutral-900/70' },
  lilac:  { key: 'lilac',  label: 'Lila',      swatch: '#D499F0', bg: 'bg-pink-200',     text: 'text-neutral-900', muted: 'text-neutral-900/70' },
  mint:   { key: 'mint',   label: 'Menta',     swatch: '#00D68F', bg: 'bg-green',        text: 'text-white',      muted: 'text-white/75' },
  coral:  { key: 'coral',  label: 'Coral',     swatch: '#DC2626', bg: 'bg-red',          text: 'text-white',      muted: 'text-white/75' },
  grape:  { key: 'grape',  label: 'Morado',    swatch: '#8A11BC', bg: 'bg-primary',      text: 'text-white',      muted: 'text-white/75' },
  ink:    { key: 'ink',    label: 'Tinta',     swatch: '#0D0D0D', bg: 'bg-neutral-900',  text: 'text-white',      muted: 'text-white/70' },
};

export function getBlogAccent(key?: string | null): BlogAccentTheme | null {
  if (!key) return null;
  return Object.prototype.hasOwnProperty.call(BLOG_ACCENTS, key) ? BLOG_ACCENTS[key as BlogAccentColor] : null;
}

// Pura — sin I/O, testeable sin mockear Supabase (mismo criterio que
// lib/classes/helpers.ts). Estima minutos de lectura a partir del texto
// Markdown crudo: cuenta palabras separadas por espacio, sin intentar
// parsear la sintaxis (un "# título" o un link cuentan como palabras, es
// una estimación, no una medida exacta).
const WORDS_PER_MINUTE = 200;

export function estimateReadingTime(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 1;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

// Mismo criterio en app/blog/page.tsx (la card grande) y en generateMetadata
// (la imagen de og:image) — un solo lugar para "cuál post es el destacado"
// evita que ambos se desincronicen si el criterio cambia.
export function pickFeaturedPost(posts: BlogPost[]) {
  return posts.find(p => p.isFeatured) ?? posts[0];
}

// Mismo criterio de acentos/mayúsculas que lib/search/normalize.ts
// (normalizeText), pero acá no importamos ese módulo — es una utilidad de
// búsqueda de clases, sin relación con el blog; slug de encabezado es un
// concepto propio de esta feature, más simple (no necesita extractKeywords).
export function slugifyHeading(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export interface Heading {
  text: string;
  slug: string;
}

// Extrae los encabezados de nivel 2 (## ) del Markdown crudo, en orden, para
// armar el índice ("En este artículo") del post — nivel 2 nada más: un
// índice con nivel 3 incluido queda demasiado largo para ser útil como
// navegación rápida. BlogPostClient usa el mismo slugifyHeading() al
// renderizar cada <h2> real, así los anchors #slug siempre coinciden con
// este índice sin tener que sincronizar dos implementaciones.
export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  const seenSlugs = new Set<string>();
  for (const line of markdown.split('\n')) {
    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const text = match[1].trim();
    if (!text) continue;
    let slug = slugifyHeading(text);
    // Colisión de slugs (dos "## Conclusión" en el mismo post, por ejemplo)
    // — sufijo numérico para que cada anchor siga siendo único, mismo
    // criterio que generate_blog_post_slug() en la migración SQL.
    let suffix = 2;
    while (seenSlugs.has(slug)) {
      slug = `${slugifyHeading(text)}-${suffix}`;
      suffix += 1;
    }
    seenSlugs.add(slug);
    headings.push({ text, slug });
  }
  return headings;
}

export interface FaqItem {
  question: string;
  answer: string;
}

// Quita el marcado inline más común (negrita, cursiva, links) para dejar
// texto plano — el JSON-LD de FAQPage espera texto, no Markdown.
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

// Busca una sección "## Preguntas frecuentes" (case-insensitive) en el
// Markdown y la interpreta como pares pregunta/respuesta: cada "### " dentro
// de esa sección es una pregunta, y el texto hasta el siguiente encabezado
// es la respuesta. Devuelve null si el post no tiene esa sección — no todos
// los artículos necesitan FAQ, y un array vacío se prestaría a confundirse
// con "tiene la sección pero está vacía". Usado para emitir FAQPage JSON-LD
// (rich snippets en Google) sin duplicar el contenido a mano en la DB.
export function extractFaqs(markdown: string): FaqItem[] | null {
  const lines = markdown.split('\n');
  const startIndex = lines.findIndex(line => /^##\s+preguntas frecuentes\s*$/i.test(line.trim()));
  if (startIndex === -1) return null;

  const faqs: FaqItem[] = [];
  let currentQuestion: string | null = null;
  let currentAnswer: string[] = [];

  const flush = () => {
    if (currentQuestion && currentAnswer.length > 0) {
      faqs.push({ question: currentQuestion, answer: stripInlineMarkdown(currentAnswer.join(' ')) });
    }
  };

  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s+/.test(line)) break; // siguiente sección de nivel 2 — fin del FAQ
    const questionMatch = /^###\s+(.+?)\s*$/.exec(line);
    if (questionMatch) {
      flush();
      currentQuestion = stripInlineMarkdown(questionMatch[1]);
      currentAnswer = [];
    } else if (currentQuestion && line.trim()) {
      currentAnswer.push(line.trim());
    }
  }
  flush();

  return faqs.length > 0 ? faqs : null;
}
