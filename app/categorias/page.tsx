import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import { fetchDanceStyles, fetchStyleClassCounts } from '@/lib/catalog/queries';
import { STYLE_IMAGES, CATEGORY_GRADIENTS } from '@/lib/catalog/styleImages';

// Rotates across Kynea's small accent palette — the same four hues as the
// profile avatar initials (AVATAR_PALETTE in HomeClient.tsx) — so text-only
// tiles stay scannable next to each other without needing a photo.
const DOT_COLORS = ['bg-primary', 'bg-blue-pastel-dark', 'bg-green-dark', 'bg-yellow-dark'];

function classCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'clase' : 'clases'}`;
}

export default async function CategoriasPage() {
  const [danceStyles, classCounts] = await Promise.all([
    fetchDanceStyles(),
    fetchStyleClassCounts(),
  ]);
  // Only styles with a real curated photo get the photo-tile treatment —
  // the rest used to fall back to 1 of 2 generic stock photos repeated
  // across 50+ tiles, which read as near-duplicates. Text-only tiles below
  // are honest about not having a photo instead of faking one.
  const featured = danceStyles.filter(s => STYLE_IMAGES[s.slug]);
  const rest = danceStyles.filter(s => !STYLE_IMAGES[s.slug]);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-20">
        <h1 className="text-[36px] font-black tracking-tight text-neutral-900 mb-2">Categorías</h1>
        <p className="text-neutral-600 text-[15px] mb-10">Explora todos los estilos de baile disponibles en Kynea.</p>

        {danceStyles.length === 0 ? (
          <p className="text-neutral-600 text-sm">Todavía no hay categorías disponibles.</p>
        ) : (
          <>
            {featured.length > 0 && (
              <div className="mb-12">
                <h2 className="text-[15px] font-bold text-neutral-900 mb-4">Destacadas</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {featured.map((style, i) => {
                    const count = classCounts[style.id] ?? 0;
                    return (
                      <Link
                        key={style.id}
                        href={`/categorias/${style.slug}`}
                        className="relative h-[152px] rounded-2xl border border-neutral-900 cursor-pointer group select-none block overflow-hidden"
                      >
                        <div className="absolute inset-0 scale-100 group-hover:scale-110 transition-transform duration-200 ease-out">
                          <div
                            className="absolute inset-0 -z-10"
                            style={{ background: CATEGORY_GRADIENTS[i % CATEGORY_GRADIENTS.length] }}
                          />
                          <Image
                            src={STYLE_IMAGES[style.slug]}
                            alt=""
                            aria-hidden="true"
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover"
                          />
                        </div>

                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/0 transition-opacity duration-200 group-hover:from-black/60" />

                        <div className="relative z-10 p-4 h-full flex flex-col justify-end">
                          <p className="text-[17px] font-black text-white tracking-tight leading-none drop-shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5">
                            {style.name}
                          </p>
                          {count > 0 && (
                            <p className="text-[12px] font-semibold text-white/75 mt-1">{classCountLabel(count)}</p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {rest.length > 0 && (
              <div>
                <h2 className="text-[15px] font-bold text-neutral-900 mb-4">Todos los estilos</h2>
                {/* Bento rhythm: every 6th tile spans 2 cols/2 rows so the grid
                    doesn't read as one uniform stack of identical boxes — this
                    is what actually breaks the "crowded" feel on a narrow
                    2-column mobile grid, not just spacing. grid-flow-dense
                    backfills the gaps the bigger cells leave behind. */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 auto-rows-[108px] grid-flow-dense gap-3">
                  {rest.map((style, i) => {
                    const isBig = i % 6 === 2;
                    const count = classCounts[style.id] ?? 0;
                    return (
                      <Link
                        key={style.id}
                        href={`/categorias/${style.slug}`}
                        className={`group flex flex-col h-full rounded-2xl border border-neutral-900 bg-white select-none transition-[background-color,transform,box-shadow] duration-150 ease-out hover:bg-neutral-50 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(17,17,17,0.08)] active:scale-[0.98] ${
                          isBig ? 'col-span-2 row-span-2 justify-end gap-2 px-5 py-4' : 'justify-between px-4 py-3.5'
                        }`}
                      >
                        <span className={`shrink-0 rounded-full ${DOT_COLORS[i % DOT_COLORS.length]} ${isBig ? 'w-3 h-3' : 'w-2 h-2'}`} aria-hidden="true" />
                        <div>
                          <p className={`font-black text-neutral-900 tracking-tight leading-tight line-clamp-2 ${isBig ? 'text-[24px]' : 'text-[15px]'}`}>
                            {style.name}
                          </p>
                          {count > 0 && (
                            <p className={`text-neutral-400 font-medium mt-0.5 ${isBig ? 'text-[13px]' : 'text-[11px]'}`}>
                              {classCountLabel(count)}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
