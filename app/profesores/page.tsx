import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SmartImage from '@/components/SmartImage';
import { fetchFeaturedProfiles } from '@/lib/profiles/queries';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TrackedProfileLink from '@/components/TrackedProfileLink';
import { SITE_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Profesores de danza — Kynea',
  description: 'Descubre profesores de danza verificados en Latinoamérica. Encuentra tu instructor ideal en Kynea.',
  alternates: { canonical: `${SITE_URL}/profesores` },
  openGraph: {
    title: 'Profesores de danza — Kynea',
    description: 'Descubre profesores de danza verificados en Latinoamérica. Encuentra tu instructor ideal en Kynea.',
    url: `${SITE_URL}/profesores`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Profesores de danza — Kynea',
    description: 'Descubre profesores de danza verificados en Latinoamérica. Encuentra tu instructor ideal en Kynea.',
  },
};

export default async function ProfesoresPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  if (params?.type === 'academia') {
    redirect('/academias');
  }

  const teachers = await fetchFeaturedProfiles('profesor');

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <h1 className="text-[32px] font-black text-neutral-900 mb-2">Profesores de danza</h1>
        <p className="text-neutral-600 mb-10">Encuentra los mejores instructores de danza en Latinoamérica</p>

        {teachers.length > 0 && (
          <section className="mb-12">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {teachers.map(t => (
                <TrackedProfileLink key={t.id} href={`/profesores/${t.slug}`}
                  role="profesor" profileId={t.id} profileName={t.name} listName="profesores_directorio"
                  className="border border-neutral-200 rounded-2xl overflow-hidden transition-[box-shadow,border-color,transform] duration-150 ease-out hover:border-neutral-300 hover:shadow-[0_12px_28px_rgba(17,17,17,0.08)] hover:-translate-y-0.5 active:scale-[0.98] group block">
                  <div className="relative w-full h-48 overflow-hidden bg-neutral-200 group-hover:scale-105 transition-transform duration-200">
                    {t.photo ? (
                      <SmartImage src={t.photo} alt={t.name} fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover"
                        style={{ objectPosition: t.photoPosition || '50% 50%', transform: `scale(${t.photoZoom || 1})` }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-5xl font-black text-neutral-400 select-none">
                          {t.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-neutral-900 text-[15px] leading-tight">{t.name}</h3>
                    {t.nationality && <p className="text-[12px] text-neutral-400 mt-0.5">{t.nationality}</p>}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {t.styles.slice(0, 2).map(s => (
                        <span key={s} className="badge-pink text-[11px] px-2 py-0.5">{s}</span>
                      ))}
                    </div>
                  </div>
                </TrackedProfileLink>
              ))}
            </div>
          </section>
        )}

        {teachers.length === 0 && (
          <div className="text-center py-24 text-neutral-400 animate-fade-in">
            <p className="text-5xl mb-4 animate-pop">🕺</p>
            <p className="text-[16px]">Pronto habrá profesores disponibles.</p>
          </div>
        )}

        <div className="mt-16 bg-neutral-50 rounded-2xl border border-neutral-200 p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-neutral-900 mb-1">¿Eres profesor de baile?</h3>
            <p className="text-neutral-600 text-sm">Publica tus clases gratis y conecta con cientos de alumnos en Latinoamérica.</p>
          </div>
          <Link href="/profesores/unete" className="btn-dark whitespace-nowrap text-sm px-6 py-3 shrink-0">
            Únete como profesor
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}

