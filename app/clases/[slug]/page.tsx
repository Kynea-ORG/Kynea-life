import { notFound, permanentRedirect } from 'next/navigation';
import { fetchClassBySlug, fetchClassById } from '@/lib/classes/queries';
import ClaseDetailClient from './ClaseDetailClient';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ClaseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let cls = await fetchClassBySlug(slug);

  // Links a los ids planos que los profesores ya compartieron antes del
  // cambio a slug — en vez de 404, redirige de forma permanente a la URL
  // canónica para no romper lo que ya está publicado por ahí.
  if (!cls && UUID_RE.test(slug)) {
    cls = await fetchClassById(slug);
    if (cls) permanentRedirect(`/clases/${cls.slug}`);
  }

  if (!cls || cls.status !== 'published') notFound();

  return <ClaseDetailClient cls={cls} />;
}
