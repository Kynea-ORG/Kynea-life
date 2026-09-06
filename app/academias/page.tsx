import type { Metadata } from 'next';
import Link from 'next/link';
import SmartImage from '@/components/SmartImage';
import { fetchFeaturedProfiles } from '@/lib/profiles/queries';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TrackedProfileLink from '@/components/TrackedProfileLink';
import { SITE_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Academias de danza — Kynea',
  description: 'Descubre las mejores academias y escuelas de danza en Latinoamérica. Encuentra tu academia ideal en Kynea.',
  alternates: { canonical: `${SITE_URL}/academias` },
  openGraph: {
    title: 'Academias de danza — Kynea',
    description: 'Descubre las mejores academias y escuelas de danza en Latinoamérica. Encuentra tu academia ideal en Kynea.',
    url: `${SITE_URL}/academias`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Academias de danza — Kynea',
    description: 'Descubre las mejores academias y escuelas de danza en Latinoamérica. Encuentra tu academia ideal en Kynea.',
  },
};

export default async function AcademiasPage() {
  const academias = await fetchFeaturedProfiles('academia');

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <h1 className="text-[32px] font-black text-neutral-900 mb-2">Academias de danza</h1>
        <p className="text-neutral-600 mb-10">Espacios y academias de baile en Latinoamérica</p>

        {academias.length > 0 && (
          <section className="mb-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {academias.map(t => (
                <TrackedProfileLink
                  key={t.id}
                  href={`/academias/${t.slug}`}
                  role="academia"
                  profileId={t.id}
                  profileName={t.name}
                  listName="academias_directorio"
                  className="flex items-start gap-4 border border-neutral-200 rounded-2xl p-4 transition-[box-shadow,border-color,transform] duration-150 ease-out hover:border-neutral-300 hover:shadow-[0_12px_28px_rgba(17,17,17,0.08)] hover:-translate-y-0.5 active:scale-[0.98] group"
                >
                  <div className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-neutral-200 group-hover:scale-105 transition-transform duration-200">
                    {t.photo ? (
                      <SmartImage
                        src={t.photo}
                        alt={t.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                        style={{ objectPosition: t.photoPosition || '50% 50%', transform: `scale(${t.photoZoom || 1})` }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl font-black text-neutral-400 select-none">
                          {t.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-neutral-900 text-[16px] truncate">{t.name}</h3>
                    {t.nationality && <p className="text-[12px] text-neutral-400 mt-0.5">{t.nationality}</p>}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {t.styles.slice(0, 3).map(s => (
                        <span key={s} className="badge-pink text-[11px] px-2 py-0.5">{s}</span>
                      ))}
                      {t.styles.length > 3 && (
                        <span className="text-[11px] text-neutral-400 px-1">+{t.styles.length - 3}</span>
                      )}
                    </div>
                  </div>
                </TrackedProfileLink>
              ))}
            </div>
          </section>
        )}

        {academias.length === 0 && (
          <div className="text-center py-24 text-neutral-400 animate-fade-in">
            <p className="text-5xl mb-4 animate-pop">🏛️</p>
            <p className="text-[16px]">Pronto habrá academias disponibles.</p>
          </div>
        )}

        <div className="mt-16 bg-neutral-50 rounded-2xl border border-neutral-200 p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-neutral-900 mb-1">¿Tienes una academia o escuela de baile?</h3>
            <p className="text-neutral-600 text-sm">Publica todas tus clases en un solo lugar y llega a cientos de alumnos en Latinoamérica.</p>
          </div>
          <Link href="/academias/unete" className="btn-dark whitespace-nowrap text-sm px-6 py-3 shrink-0">
            Registra tu academia
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
