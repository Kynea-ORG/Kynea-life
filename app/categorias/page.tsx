import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import { fetchDanceStyles } from '@/lib/catalog/queries';
import { STYLE_IMAGES, FALLBACK_CATEGORY_IMAGES, CATEGORY_GRADIENTS } from '@/lib/catalog/styleImages';

export default async function CategoriasPage() {
  const danceStyles = await fetchDanceStyles();

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-20">
        <h1 className="text-[36px] font-black tracking-tight text-neutral-900 mb-2">Categorías</h1>
        <p className="text-neutral-500 text-[15px] mb-10">Explora todos los estilos de baile disponibles en Kynea.</p>

        {danceStyles.length === 0 ? (
          <p className="text-neutral-500 text-sm">Todavía no hay categorías disponibles.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {danceStyles.map((style, i) => (
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
                    src={STYLE_IMAGES[style.slug] ?? FALLBACK_CATEGORY_IMAGES[i % FALLBACK_CATEGORY_IMAGES.length]}
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
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
