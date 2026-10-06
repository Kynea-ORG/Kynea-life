import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const WOMEN_TEACHERS_HREF = '/clases?profesoras=1';

// Imagen de fondo del banner (ancha, ~1600×600 webp). Si el archivo no existe se ve el degradado de la marca.
const BANNER_IMAGE = '/profesoras-banner.webp';

// Sección del Home que lleva a las clases dictadas por profesoras (etiquetadas por el equipo
// de Kynea, ver migración 63). Toda la tarjeta es el enlace.
export default function WomenTeachersBanner({ classCount }: { classCount: number }) {
  return (
    <section className="bg-white pb-8">
      <div className="max-w-[1200px] mx-auto px-6">
        <Link
          href={WOMEN_TEACHERS_HREF}
          prefetch={false}
          className="group relative block overflow-hidden rounded-3xl border border-neutral-900 min-h-[170px] sm:min-h-[200px]"
        >
          {/* Imagen + degradado como fondos múltiples: si el archivo todavía no existe (404) solo se ve
              el degradado, sin el ícono de imagen rota que dejaría un <img>. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 scale-100 group-hover:scale-105 transition-transform duration-500 ease-out"
            style={{
              backgroundImage: `url('${BANNER_IMAGE}'), linear-gradient(110deg, #6d0d97 0%, #8a11bc 45%, #c026a3 100%)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/0 transition-opacity duration-300 group-hover:from-primary-dark/75"
          />

          <div className="relative z-10 flex h-full min-h-[170px] sm:min-h-[200px] flex-col justify-center gap-3 p-6 sm:p-9 max-w-[640px]">
            <h2 className="text-[26px] sm:text-[34px] font-black leading-[1.05] tracking-[-0.02em] text-white">
              Clases con profesoras mujeres
            </h2>
            <p className="text-[14.5px] sm:text-[16px] text-white/85 leading-snug max-w-[460px]">
              Aprende con instructoras de baile de toda Latinoamérica.
            </p>
            <div className="mt-1 flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[14px] font-bold text-neutral-900 transition-transform duration-200 group-hover:translate-x-0.5">
                Ver clases <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </span>
              {classCount > 0 && (
                <span className="text-[13px] font-semibold text-white/90">
                  {classCount} {classCount === 1 ? 'clase' : 'clases'}
                </span>
              )}
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
