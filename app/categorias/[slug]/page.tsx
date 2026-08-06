import { notFound } from 'next/navigation';
import { fetchPublishedClasses } from '@/lib/classes/queries';
import type { ClassFilters } from '@/lib/classes/types';
import { fetchDanceStyles, fetchClassLevels } from '@/lib/catalog/queries';
import CategoriaDetailContent from './CategoriaDetailContent';

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function CategoriaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const danceStyles = await fetchDanceStyles();
  const style = danceStyles.find(s => s.slug === slug);
  if (!style) notFound();

  const filters: ClassFilters = {
    query:      (sp.q as string | undefined) || undefined,
    styles:     [style.name],
    levels:     asArray(sp.level),
    modalities: asArray(sp.modality),
    types:      asArray(sp.type),
    days:       asArray(sp.day),
    city:       (sp.city as string | undefined) || undefined,
    withSpots:  sp.spots === '1' || undefined,
  };

  const [classes, levels] = await Promise.all([
    fetchPublishedClasses(filters),
    fetchClassLevels(),
  ]);

  return (
    <CategoriaDetailContent
      style={style}
      initialClasses={classes}
      levels={levels.map(l => l.name)}
    />
  );
}
