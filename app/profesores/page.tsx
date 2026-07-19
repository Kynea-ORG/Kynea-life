import Link from 'next/link';
import Image from 'next/image';
import { fetchFeaturedProfiles } from '@/lib/profiles/queries';
import Header from '@/components/Header';

export default async function ProfesoresPage() {
  const [teachers, academias] = await Promise.all([
    fetchFeaturedProfiles('profesor', 20),
    fetchFeaturedProfiles('academia', 20),
  ]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <h1 className="text-[32px] font-black text-neutral-900 mb-2">Profesores y academias</h1>
        <p className="text-neutral-500 mb-10">Encuentra los mejores instructores de danza en Latinoamérica</p>

        {teachers.length > 0 && (
          <section className="mb-12">
            <h2 className="text-[20px] font-bold text-neutral-900 mb-5">Profesores</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {teachers.map(t => (
                <Link key={t.id} href={`/profesores/${t.id}`}
                  className="border border-neutral-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
                  <div className="relative w-full h-48 overflow-hidden bg-neutral-200">
                    {t.photo ? (
                      <Image src={t.photo} alt={t.name} fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover object-top group-hover:scale-105 transition-transform duration-300" />
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
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {t.styles.slice(0, 2).map(s => (
                        <span key={s} className="text-[11px] bg-pink-50 text-pink-600 border border-pink-100 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {academias.length > 0 && (
          <section>
            <h2 className="text-[20px] font-bold text-neutral-900 mb-5">Academias</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {academias.map(t => (
                <Link key={t.id} href={`/profesores/${t.id}`}
                  className="flex items-start gap-4 border border-neutral-100 rounded-xl p-4 hover:shadow-md transition-shadow group">
                  <div className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-neutral-200">
                    {t.photo ? (
                      <Image src={t.photo} alt={t.name} fill sizes="64px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl font-black text-neutral-400 select-none">
                          {t.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 text-[15px]">{t.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {t.styles.slice(0, 3).map(s => (
                        <span key={s} className="text-[11px] bg-pink-50 text-pink-600 border border-pink-100 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {teachers.length === 0 && academias.length === 0 && (
          <div className="text-center py-24 text-neutral-400">
            <p className="text-5xl mb-4">🕺</p>
            <p className="text-[16px]">Pronto habrá profesores disponibles.</p>
          </div>
        )}
      </div>
    </div>
  );
}
