import { notFound, permanentRedirect } from 'next/navigation';
import { fetchClassBySlug, fetchClassById } from '@/lib/classes/queries';
import { classUrl } from '@/lib/classes/helpers';
import ClaseDetailClient from './ClaseDetailClient';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ClaseDetailPage({
  params,
}: {
  params: Promise<{ categoria: string; tipo: string; slug: string }>;
}) {
  const { categoria, tipo, slug } = await params;
  let cls = await fetchClassBySlug(slug);

  // Links a los ids planos que los profesores ya compartieron antes del
  // cambio a slug — en vez de 404, redirige de forma permanente a la URL
  // canónica para no romper lo que ya está publicado por ahí.
  if (!cls && UUID_RE.test(slug)) cls = await fetchClassById(slug);

  if (!cls || cls.status !== 'published') notFound();

  // La categoría/tipo en la URL debe coincidir con el estilo principal y el
  // tipo reales de la clase — si cambiaron (o el link es viejo), redirige a
  // la URL canónica en vez de servir contenido bajo una ruta desactualizada.
  const canonical = classUrl(cls);
  if (canonical !== `/${categoria}/${tipo}/${slug}`) permanentRedirect(canonical);

  return <ClaseDetailClient cls={cls} />;
}
