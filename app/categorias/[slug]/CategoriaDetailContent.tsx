'use client';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft } from 'lucide-react';
import ClassBrowser from '@/components/ClassBrowser';
import { STYLE_IMAGES, FALLBACK_CATEGORY_IMAGES } from '@/lib/catalog/styleImages';
import type { DanceClass, DbDanceStyle } from '@/lib/types';

export default function CategoriaDetailContent({
  style,
  initialClasses,
  levels = [],
}: {
  style: DbDanceStyle;
  initialClasses: DanceClass[];
  levels?: string[];
}) {
  const heroImage = STYLE_IMAGES[style.slug] ?? FALLBACK_CATEGORY_IMAGES[0];

  return (
    <ClassBrowser
      baseUrl={`/categorias/${style.slug}`}
      initialClasses={initialClasses}
      includeStyles={false}
      levels={levels}
      searchPlaceholder={`Busca dentro de ${style.name}: profesor, academia o distrito…`}
      renderResultsCount={count => (
        <><span className="font-bold text-neutral-900">{count}</span> clase{count !== 1 ? 's' : ''} de {style.name}</>
      )}
      emptyText={`No encontramos clases de ${style.name} con esos filtros. Prueba cambiando la ciudad, nivel o día.`}
      listName="categorias_grid"
      topSlot={
        <div className="relative h-48 sm:h-56 overflow-hidden">
          <Image src={heroImage} alt="" aria-hidden="true" fill sizes="100vw" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
          <div className="relative z-10 h-full max-w-[1200px] mx-auto px-6 flex flex-col justify-end pb-6">
            <Link href="/categorias" className="inline-flex items-center gap-1 text-white/80 text-[13px] font-medium mb-2 hover:text-white transition-colors w-fit">
              <ChevronLeft className="w-3.5 h-3.5" /> Categorías
            </Link>
            <h1 className="text-[32px] sm:text-[40px] font-black tracking-tight text-white leading-none">{style.name}</h1>
          </div>
        </div>
      }
    />
  );
}
