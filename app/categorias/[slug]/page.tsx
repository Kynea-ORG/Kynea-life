import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchPublishedClasses } from '@/lib/classes/queries';
import type { ClassFilters } from '@/lib/classes/types';
import { fetchDanceStyles, fetchClassLevels } from '@/lib/catalog/queries';
import { SITE_URL } from '@/lib/constants';
import CategoriaDetailContent from './CategoriaDetailContent';

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const danceStyles = await fetchDanceStyles();
  const style = danceStyles.find(s => s.slug === slug);
  if (!style) return { title: 'Categoría no encontrada — Kynea' };

  const title = `Clases de ${style.name} — Kynea`;
  const description = `Encuentra clases de ${style.name} cerca de ti: horarios, niveles y profesores verificados en Kynea.`;
  const canonical = `${SITE_URL}/categorias/${slug}`;
  // Categoría sin ninguna clase publicada: contenido vacío, no vale la pena
  // indexarlo — Google ya lo estaba marcando como delgado sin que lo supiéramos.
  const classes = await fetchPublishedClasses({ styles: [style.name] });
  const isEmpty = classes.length === 0;

  return {
    title,
    description,
    alternates: { canonical },
    ...(isEmpty && { robots: { index: false, follow: true } }),
    openGraph: { title, description, url: canonical, type: 'website' },
  };
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
