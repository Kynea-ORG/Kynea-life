import WomenTeachersBanner from './WomenTeachersBanner';
import BlogHighlightCard from './BlogHighlightCard';
import type { BlogHighlight } from '@/lib/blog/highlight';

// Sección de destacados del Home, debajo de Categorías: a la izquierda las clases con profesoras
// y a la derecha una invitación a leer el blog. Dos tarjetas con la misma estructura visual
// (FeatureCard); en mobile son un slider horizontal.
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

  const both = showWomen && showBlog;
  // Con las dos: en mobile es un slider horizontal (snap) para no alargar el Home; la segunda tarjeta
  // asoma a la derecha para invitar a deslizar. Desde md vuelven a ser dos columnas del mismo alto.
  // Con una sola tarjeta ocupa todo el ancho, sin slider.
  const track = both
    ? 'flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-pl-6 no-scrollbar -mx-6 px-6 pb-1 md:mx-0 md:px-0 md:pb-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible'
    : 'grid';
  const item = both ? 'w-[86%] shrink-0 snap-start md:w-auto md:shrink' : '';

  return (
    <section className="bg-white pb-8" aria-label="Destacados">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className={track}>
          {showWomen && (
            <div className={item}>
              <WomenTeachersBanner classCount={womenClassCount} />
            </div>
          )}
          {showBlog && blogHighlight && (
            <div className={item}>
              <BlogHighlightCard post={blogHighlight} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
