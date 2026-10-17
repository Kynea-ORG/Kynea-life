// lib/classes/slug.ts
//
// Slugs de clase en el cliente. Espejo de public.slugify() en SQL (migración 30),
// que sigue siendo la fuente de verdad: el trigger normaliza y garantiza unicidad
// (sufijo -2, -3…) al guardar. Esto solo adelanta la URL mientras el profesor
// escribe el título. Módulo puro, sin imports de servidor, para usarlo en Client Components.

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Título → slug: minúsculas, sin tildes, solo [a-z0-9] unidos por un guion. */
export function slugifyTitle(title: string): string {
  return stripAccents(title)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Lo que se acepta mientras el profesor escribe a mano en el campo de URL.
 *  Conserva un guion final (para poder seguir escribiendo "mi-clase-" → "mi-clase-02"). */
export function sanitizeSlugInput(raw: string): string {
  return stripAccents(raw)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '');
}
