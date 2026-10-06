// Estructura visual compartida por las tarjetas de la sección de destacados del Home
// (clases con profesoras, blog): mismo alto, misma esquina y borde, imagen de fondo con
// capa oscura, texto blanco abajo a la izquierda y el mismo botón blanco. Así dos tarjetas
// con contenido distinto se ven como una familia.
import type { CSSProperties, ReactNode } from 'react';

export const FEATURE_CARD_CTA =
  'relative z-10 inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-[14px] font-bold text-neutral-900 transition-[transform,background-color] duration-200 hover:bg-neutral-100 active:scale-[0.97]';

export const FEATURE_CARD_TITLE =
  'text-[26px] sm:text-[30px] font-black leading-[1.08] tracking-[-0.02em] text-white line-clamp-3';

export const FEATURE_CARD_TEXT = 'text-[14.5px] sm:text-[15.5px] leading-snug text-white/85 line-clamp-3 max-w-[460px]';

export default function FeatureCard({
  background,
  children,
}: {
  /** Fondo CSS (imagen y/o degradado). Con varios fondos, si la imagen falla se ve el degradado. */
  background: CSSProperties['background'];
  children: ReactNode;
}) {
  return (
    <article className="group relative h-full min-h-[260px] md:min-h-[320px] overflow-hidden rounded-3xl border border-neutral-900">
      <div
        aria-hidden="true"
        className="absolute inset-0 scale-100 transition-transform duration-500 ease-out group-hover:scale-105"
        style={{ background, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/15 transition-opacity duration-300 group-hover:from-primary-dark/80"
      />
      <div className="relative z-10 flex h-full min-h-[260px] md:min-h-[320px] flex-col justify-end gap-3 p-6 sm:p-8">
        {children}
      </div>
    </article>
  );
}
