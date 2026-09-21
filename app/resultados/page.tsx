import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { searchClassesWithAi } from '@/lib/ai/searchService';
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
  return {
    title: query ? `Resultados para "${query}" — Kynea` : 'Resultados de búsqueda — Kynea',
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

  const [aiSearchResult, profiles] = await Promise.all([
    searchClassesWithAi(query, { city }),
    searchProfilesByName(query),
  ]);

  const profesores = profiles.filter(p => p.type === 'profesor');
  const academias = profiles.filter(p => p.type === 'academia');

  return (
    <ResultadosClient
      query={query}
      classes={aiSearchResult.classes}
      profesores={profesores}
      academias={academias}
      aiSummary={aiSearchResult.aiSummary}
      matchBadges={aiSearchResult.matchBadges}
    />
  );
}

