import WomenTeachersBanner from './WomenTeachersBanner';
import BlogHighlightCard from './BlogHighlightCard';
import type { BlogHighlight } from '@/lib/blog/highlight';

// Sección de destacados del Home, debajo de Categorías: a la izquierda las clases con profesoras
// y a la derecha una invitación a leer el blog. Dos tarjetas con la misma estructura visual
// (FeatureCard); en mobile se apilan, con el mismo orden.
export default function HomeFeatureCards({
  womenClassCount,
  blogHighlight,
}: {
  /** null = sin tarjeta de profesoras. */
  womenClassCount?: number | null;
  /** null = sin tarjeta del blog. */
  blogHighlight?: BlogHighlight | null;
}) {
  const showWomen = womenClassCount != null;
  const showBlog = Boolean(blogHighlight);
  if (!showWomen && !showBlog) return null;

  return (
    <section className="bg-white pb-8" aria-label="Destacados">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className={`grid gap-4 md:gap-6 ${showWomen && showBlog ? 'md:grid-cols-2' : ''}`}>
          {showWomen && <WomenTeachersBanner classCount={womenClassCount} />}
          {showBlog && blogHighlight && <BlogHighlightCard post={blogHighlight} />}
        </div>
      </div>
    </section>
  );
}
