import { notFound, permanentRedirect } from 'next/navigation';
import { fetchClassBySlug, fetchClassById } from '@/lib/classes/queries';
import { classUrl } from '@/lib/classes/helpers';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Legacy URL shape (/clases/[slug], and even older /clases/[id] links already
// shared before slugs existed) — redirect permanently to the canonical
// /{categoria}/{tipo}/{slug} URL instead of 404ing on links already out there.
export default async function LegacyClaseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let cls = await fetchClassBySlug(slug);
  if (!cls && UUID_RE.test(slug)) cls = await fetchClassById(slug);
  if (cls) permanentRedirect(classUrl(cls));
  notFound();
}
