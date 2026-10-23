import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { searchClassesWithAi } from '@/lib/ai/searchService';
import { parseFilterParams } from '@/lib/ai/filterParams';
import { findRelaxations } from '@/lib/ai/relaxations';
import { fetchPublishedClasses } from '@/lib/classes/queries';
import { computeCatalogSignals } from '@/lib/search/catalogSignals';
import { formatRefinedTitle } from '@/lib/ai/refinedTitle';
import { searchProfilesByName } from '@/lib/profiles/queries';
import { SITE_URL } from '@/lib/constants';
import ResultadosClient from './ResultadosClient';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const query = (params.q as string | undefined)?.trim() || '';
  const { filters, tags, refined } = parseFilterParams(params);
  const displayTitle = refined ? formatRefinedTitle(filters, tags) : query;

  return {
    title: displayTitle ? `Resultados para "${displayTitle}" — Kynea` : 'Resultados de búsqueda — Kynea',
    alternates: { canonical: `${SITE_URL}/resultados` },
    // Página dinámica sobre texto arbitrario del visitante — mismo criterio
    // que categorías vacías/clases vencidas (ver docs/TASKS.md): no vale la
    // pena indexarla, es contenido delgado y duplicado por definición.
    robots: { index: false, follow: true },
  };
}

// Adónde cae una búsqueda AMBIGUA o en lenguaje natural
// — ver lib/search/resolveSearch.ts, que decide cuándo NO caer acá (estilo
// exacto → /clases?style=; profesor/academia exacto → su perfil directo).
export default async function ResultadosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = (params.q as string | undefined)?.trim() || '';
  const city = (params.city as string | undefined) || undefined;

  if (!query) redirect('/clases');

  // r=1 → el usuario editó los chips: se respetan sus filtros y no se vuelve a llamar a Gemini
  const { filters, tags, refined } = parseFilterParams(params);
  const displayTitle = refined ? formatRefinedTitle(filters, tags) : query;

  const [aiSearchResult, profiles] = await Promise.all([
    searchClassesWithAi(query, { city, refinement: refined ? { filters, tags } : undefined }),
    searchProfilesByName(query),
  ]);

  const isOutOfDomain = Boolean(aiSearchResult.interpretation?.isOutOfDomain);
  const noClasses = aiSearchResult.classes.length === 0;
  const interpreted = aiSearchResult.interpretation;
  const [relaxations, suggestedStyles] = noClasses
    ? await Promise.all([
        !isOutOfDomain
          ? findRelaxations({
              query,
              city,
              filters: interpreted?.filters ?? {},
              tags: interpreted?.matchBadges ?? [],
              search: async o => (await searchClassesWithAi(query, { city: o.city, refinement: { filters: o.filters, tags: o.tags } })).classes.length,
            })
          : Promise.resolve([]),
        fetchPublishedClasses({ city })
          .then(cs => computeCatalogSignals(cs).styles.slice(0, 6).map(s => s.name))
          .catch(() => [] as string[]),
      ])
    : [[], [] as string[]];

  const profesores = isOutOfDomain ? [] : profiles.filter(p => p.type === 'profesor');
  const academias = isOutOfDomain ? [] : profiles.filter(p => p.type === 'academia');

  return (
    <ResultadosClient
      query={query}
      displayTitle={displayTitle}
      city={city}
      isOutOfDomain={isOutOfDomain}
      relaxations={relaxations}
      suggestedStyles={suggestedStyles}
      interpretedFilters={aiSearchResult.interpretation?.filters ?? null}
      interpretedTags={aiSearchResult.interpretation?.matchBadges ?? []}
      classes={aiSearchResult.classes}
      profesores={profesores}
      academias={academias}
      aiSummary={aiSearchResult.aiSummary}
      matchBadges={aiSearchResult.matchBadges}
    />
  );
}

