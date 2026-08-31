import { Suspense } from 'react';
import type { Metadata } from 'next';
import { fetchPublishedClasses } from '@/lib/classes/queries';
import type { ClassFilters } from '@/lib/classes/types';
import { fetchDanceStyles, fetchClassLevels } from '@/lib/catalog/queries';
import { fetchAcademiasWithLocation } from '@/lib/profiles/queries';
import { SITE_URL } from '@/lib/constants';
import ClasesContent from './ClasesContent';

export const metadata: Metadata = {
  title: 'Clases de baile en Latinoamérica — Kynea',
  description: 'Explora y filtra clases de danza por estilo, nivel, modalidad y ciudad. Encuentra tu próxima clase de baile en Kynea.',
  alternates: { canonical: `${SITE_URL}/clases` },
};

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function ClasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const filters: ClassFilters = {
    query:      (params.q as string | undefined) || undefined,
    styles:     asArray(params.style),
    levels:     asArray(params.level),
    modalities: asArray(params.modality),
    types:      asArray(params.type),
    days:       asArray(params.day),
    city:       (params.city as string | undefined) || undefined,
    withSpots:  params.spots === '1' || undefined,
  };

  const hasFilters = !!(
    filters.query || filters.styles?.length || filters.levels?.length ||
    filters.modalities?.length || filters.types?.length || filters.days?.length ||
    filters.city || filters.withSpots
  );

  const [classes, danceStyles, levels, academias] = await Promise.all([
    fetchPublishedClasses(hasFilters ? filters : undefined),
    fetchDanceStyles(),
    fetchClassLevels(),
    fetchAcademiasWithLocation(),
  ]);

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-neutral-400 text-[15px]">
        Cargando…
      </div>
    }>
      <ClasesContent
        initialClasses={classes}
        academias={academias}
        danceStyles={danceStyles.map(s => s.name)}
        levels={levels.map(l => l.name)}
      />
    </Suspense>
  );
}
