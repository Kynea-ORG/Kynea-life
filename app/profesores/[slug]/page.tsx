import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchTeacherClasses } from '@/lib/classes/queries';
import { fetchTeacherBySlug } from '@/lib/profiles/queries';
import { SITE_URL } from '@/lib/constants';
import { DEFAULT_ACADEMIA_COVER, truncateForMeta, buildInstagramUrl, buildTikTokUrl } from '@/lib/utils';
import ProfesorDetailClient from './ProfesorDetailClient';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const teacher = await fetchTeacherBySlug(slug);
  if (!teacher) return { title: 'Perfil no encontrado — Kynea' };

  const isAcademia = teacher.type === 'academia';
  const roleLabel = isAcademia ? 'Academia de danza en Kynea' : 'Profesor de danza en Kynea';
  const title = `${teacher.name} — ${roleLabel}`;
  const description = teacher.bio
    ? truncateForMeta(teacher.bio)
    : `Conoce a ${teacher.name}${teacher.styles.length ? `, especialista en ${teacher.styles.join(', ')}` : ''} en Kynea.`;
  const image = teacher.photo || (isAcademia ? (teacher.coverImage || DEFAULT_ACADEMIA_COVER) : undefined);
  const canonical = `${SITE_URL}/profesores/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'profile',
      ...(image && { images: [{ url: image.startsWith('http') ? image : `${SITE_URL}${image}` }] }),
    },
  };
}

export default async function ProfesorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const teacher = await fetchTeacherBySlug(slug);
  if (!teacher) notFound();

  const allClasses = await fetchTeacherClasses(teacher.id);
  const classes = allClasses.filter(c => c.status === 'published');

  const profileUrl = `${SITE_URL}/profesores/${slug}`;
  const sameAs = [
    teacher.instagram && buildInstagramUrl(teacher.instagram),
    teacher.tiktok && buildTikTokUrl(teacher.tiktok),
    teacher.website,
  ].filter((url): url is string => Boolean(url));

  // Person para profesor, Organization para academia — no forzamos
  // LocalBusiness porque el schema no trae postalCode/streetAddress
  // estructurados, solo venueAddress/venueCity/venueDistrict como texto libre.
  const jsonLd = teacher.type === 'academia'
    ? {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: teacher.name,
        url: profileUrl,
        ...(teacher.photo && { logo: teacher.photo }),
        ...(teacher.bio && { description: teacher.bio }),
        ...(sameAs.length > 0 && { sameAs }),
        ...(teacher.venueAddress && teacher.venueCity && {
          address: {
            '@type': 'PostalAddress',
            streetAddress: teacher.venueAddress,
            addressLocality: teacher.venueCity,
            ...(teacher.venueDistrict && { addressRegion: teacher.venueDistrict }),
            addressCountry: 'PE',
          },
        }),
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: teacher.name,
        url: profileUrl,
        ...(teacher.photo && { image: teacher.photo }),
        ...(teacher.bio && { description: teacher.bio }),
        ...(sameAs.length > 0 && { sameAs }),
      };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProfesorDetailClient teacher={teacher} classes={classes} />
    </>
  );
}
