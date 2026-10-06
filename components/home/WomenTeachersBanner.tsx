import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import FeatureCard, { FEATURE_CARD_CTA, FEATURE_CARD_TEXT, FEATURE_CARD_TITLE } from './FeatureCard';

export const WOMEN_TEACHERS_HREF = '/clases?profesoras=1';

// Fondo: la misma textura del hero del Home (la de mobile es liviana, 8 KB; la de desktop se carga
// solo en md+). bg-primary es el color de respaldo mientras carga o si falla.
const BG_CLASS =
  "bg-primary bg-cover bg-center bg-[url('/Background-Mobile.webp')] md:bg-[url('/Background.webp')]";

// Tarjeta que lleva a las clases dictadas por profesoras (etiquetadas por el equipo de Kynea, migración 63).
// El título es un enlace "estirado": toda la tarjeta es clicable.
export default function WomenTeachersBanner({ classCount }: { classCount: number }) {
  return (
    <FeatureCard bgClassName={BG_CLASS}>
      <h2 className={FEATURE_CARD_TITLE}>
        <Link href={WOMEN_TEACHERS_HREF} prefetch={false} className="after:absolute after:inset-0 after:content-['']">
          Clases con profesoras mujeres
        </Link>
      </h2>
      <p className={FEATURE_CARD_TEXT}>Aprende con instructoras de baile de toda Latinoamérica.</p>
      <div className="mt-1 flex items-center gap-3">
        <Link href={WOMEN_TEACHERS_HREF} prefetch={false} className={FEATURE_CARD_CTA}>
          Ver clases <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
        {classCount > 0 && (
          <span className="text-[13px] font-semibold text-white/90">
            {classCount} {classCount === 1 ? 'clase' : 'clases'}
          </span>
        )}
      </div>
    </FeatureCard>
  );
}
