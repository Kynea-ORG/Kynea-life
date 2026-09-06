import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchTeacherClasses } from '@/lib/classes/queries';
import { isClassActive } from '@/lib/classes/helpers';
import { fetchTeacherBySlug } from '@/lib/profiles/queries';
import { SITE_URL } from '@/lib/constants';
import { truncateForMeta, buildInstagramUrl, buildTikTokUrl } from '@/lib/utils';
import ProfesorDetailClient from './ProfesorDetailClient';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const teacher = await fetchTeacherBySlug(slug);
  if (!teacher) return { title: 'Perfil no encontrado — Kynea' };

  if (teacher.type === 'academia') {
    return {
      title: `${teacher.name} — Academia de danza en Kynea`,
      alternates: { canonical: `${SITE_URL}/academias/${slug}` },
    };
  }

  const title = `${teacher.name} — Profesor de danza en Kynea`;
  const description = teacher.bio
    ? truncateForMeta(teacher.bio)
    : `Conoce a ${teacher.name}${teacher.styles.length ? `, especialista en ${teacher.styles.join(', ')}` : ''} en Kynea.`;
  const image = teacher.photo;
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

  if (teacher.type === 'academia') {
    permanentRedirect(`/academias/${slug}`);
  }

  const allClasses = await fetchTeacherClasses(teacher.id);
  const classes = allClasses.filter(c => isClassActive(c));

  const profileUrl = `${SITE_URL}/profesores/${slug}`;
  const sameAs = [
    teacher.instagram && buildInstagramUrl(teacher.instagram),
    teacher.tiktok && buildTikTokUrl(teacher.tiktok),
    teacher.website,
  ].filter((url): url is string => Boolean(url));

  const jsonLd = {
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
