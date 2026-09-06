import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchClassBySlug, fetchClassById } from '@/lib/classes/queries';
import { classUrl } from '@/lib/classes/helpers';
import { SITE_URL } from '@/lib/constants';
import { truncateForMeta, getProfileUrl } from '@/lib/utils';
import ClaseDetailClient from './ClaseDetailClient';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveClass(slug: string) {
  let cls = await fetchClassBySlug(slug);
  if (!cls && UUID_RE.test(slug)) cls = await fetchClassById(slug);
  return cls;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categoria: string; tipo: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cls = await resolveClass(slug);
  if (!cls || cls.status !== 'published') return { title: 'Clase no encontrada — Kynea' };

  const title = `${cls.title} — ${cls.style} en ${cls.city} | Kynea`;
  const description = cls.shortDescription
    ? truncateForMeta(cls.shortDescription)
    : `Clase de ${cls.style} en ${cls.city} con ${cls.teacher.name}. Reserva tu lugar en Kynea.`;
  const canonical = `${SITE_URL}${classUrl(cls)}`;
  // Vencida: se excluye del sitemap y los listados (fetchPublishedClasses),
  // pero la URL sigue accesible por link directo — sin noindex quedaba
  const todayLima = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
  const isExpired = !!cls.endDate && cls.endDate < todayLima;

  return {
    title,
    description,
    alternates: { canonical },
    ...(isExpired && { robots: { index: false, follow: true } }),
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      ...(cls.coverImage && { images: [{ url: cls.coverImage.startsWith('http') ? cls.coverImage : `${SITE_URL}${cls.coverImage}` }] }),
    },
  };
}

export default async function ClaseDetailPage({
  params,
}: {
  params: Promise<{ categoria: string; tipo: string; slug: string }>;
}) {
  const { categoria, tipo, slug } = await params;
  const cls = await resolveClass(slug);

  if (!cls || cls.status !== 'published') notFound();

  // La categoría/tipo en la URL debe coincidir con el estilo principal y el
  // tipo reales de la clase — si cambiaron (o el link es viejo), redirige a
  // la URL canónica en vez de servir contenido bajo una ruta desactualizada.
  const canonical = classUrl(cls);
  if (canonical !== `/${categoria}/${tipo}/${slug}`) permanentRedirect(canonical);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: cls.title,
    description: cls.shortDescription || cls.fullDescription || undefined,
    provider: {
      '@type': cls.teacher.type === 'academia' ? 'Organization' : 'Person',
      name: cls.teacher.name,
      url: `${SITE_URL}${getProfileUrl(cls.teacher)}`,
    },
    offers: {
      '@type': 'Offer',
      price: cls.price,
      priceCurrency: cls.currency,
      url: `${SITE_URL}${classUrl(cls)}`,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ClaseDetailClient cls={cls} />
    </>
  );
}
