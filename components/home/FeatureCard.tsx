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
  bgClassName,
  veil = false,
  children,
}: {
  /** Fondo CSS (imagen y/o degradado). Con varios fondos, si la imagen falla se ve el degradado. */
  background?: CSSProperties['background'];
  /** Alternativa con clases de Tailwind (permite elegir otra imagen por breakpoint). */
  bgClassName?: string;
  /** Velo morado oscuro extra sobre la imagen: baja el contraste de fotos muy marcadas (ej. portadas del blog). */
  veil?: boolean;
  children: ReactNode;
}) {
  return (
    <article className="group relative h-full min-h-[260px] md:min-h-[320px] overflow-hidden rounded-3xl border border-neutral-900">
      <div
        aria-hidden="true"
        className={`absolute inset-0 scale-100 transition-transform duration-500 ease-out group-hover:scale-105 ${bgClassName ?? ''}`}
        style={background ? { background, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      />
      {veil && <div aria-hidden="true" className="absolute inset-0" style={{ background: 'rgba(34, 6, 52, 0.42)' }} />}
      {/* Mismos dos velos del hero (oscuro de abajo hacia arriba + tinte de marca desde la izquierda) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10 transition-opacity duration-300 group-hover:from-primary-dark/80"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'linear-gradient(100deg, rgba(138,17,188,.30) 0%, rgba(13,13,13,0) 55%)' }}
      />
      <div className="relative z-10 flex h-full min-h-[260px] md:min-h-[320px] flex-col justify-end gap-3 p-6 sm:p-8">
        {children}
      </div>
    </article>
  );
}
