// lib/ai/relaxations.ts
//
// Estado vacío guiado: cuando una búsqueda no devuelve clases, calcula qué
// pasaría al quitar cada filtro (o la ciudad) y propone solo las opciones que
// de verdad tienen resultados, con la cantidad exacta.
import { buildFilterChips, buildRefinementHref, removeChip } from './filterParams';
import type { AiSearchFilters } from './types';

export interface Relaxation {
  kind: 'filter' | 'city';
  /** Lo que se quita: "Sáb", "Barranco", "Lima"… */
  label: string;
  count: number;
  href: string;
}

type SearchCount = (opts: { city?: string; filters: AiSearchFilters; tags: string[] }) => Promise<number>;

export async function findRelaxations({
  query, city, filters, tags, search, max = 3,
}: {
  query: string;
  city?: string;
  filters: AiSearchFilters;
  tags: string[];
  search: SearchCount;
  max?: number;
}): Promise<Relaxation[]> {
  const candidates: { kind: Relaxation['kind']; label: string; city?: string; filters: AiSearchFilters; tags: string[] }[] =
    buildFilterChips(filters, tags).map(chip => {
      const next = removeChip(filters, tags, chip);
      return { kind: 'filter' as const, label: chip.label, city, ...next };
    });

  if (city) candidates.push({ kind: 'city', label: city, city: undefined, filters, tags });

  const counted = await Promise.all(
    candidates.map(async c => {
      let count = 0;
      try {
        count = await search({ city: c.city, filters: c.filters, tags: c.tags });
      } catch {
        // Una consulta fallida solo descarta esa opción.
      }
      return { ...c, count };
    }),
  );

  return counted
    .filter(c => c.count > 0)
    // sort estable: a igual cantidad se conserva el orden de los chips
    .sort((a, b) => b.count - a.count)
    .slice(0, max)
    .map(c => ({
      kind: c.kind,
      label: c.label,
      count: c.count,
      href: buildRefinementHref(query, c.city, c.filters, c.tags),
    }));
}
