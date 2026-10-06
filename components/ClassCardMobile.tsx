'use client';
import { useState } from 'react';
import Link from 'next/link';
import SmartImage from '@/components/SmartImage';
import { Bookmark, Calendar, MapPin, Sparkles } from 'lucide-react';
import type { DanceClass } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { findCountryByCode } from '@/lib/countries';
import { classUrl, isClassExpired } from '@/lib/classes/helpers';
import { cardKindLabel, cardPlaceLabel, cardWhenLabel } from '@/lib/classes/cardInfo';
import { trackSelectItem } from '@/lib/analytics';

// Tarjetas compactas para mobile (< md). Dos formatos:
//  · carousel: foto 4:3 sin borde y cuatro líneas de texto; para carruseles del Home.
//  · row: miniatura a la izquierda; para listas (/clases, resultados, perfil).
// Sin botones ni descripción: tocar la tarjeta abre la clase (el título es un enlace "estirado")
// y el contacto vive en el detalle. No muestra cupos: hoy no se conoce la cantidad real.
// Desde md se usa la tarjeta vertical de ClassCard.
export default function ClassCardMobile({
  cls,
  layout,
  listName,
  matchBadges,
}: {
  cls: DanceClass;
  layout: 'carousel' | 'row';
  listName: string;
  matchBadges?: string[];
}) {
  const [saved, setSaved] = useState(false);
  const isExpired = isClassExpired(cls);
  // País de la dirección real de la clase (venues.country_code), no la nacionalidad del profesor.
  const country = findCountryByCode(cls.countryCode);

  const when = cardWhenLabel(cls, isExpired);
  const place = cardPlaceLabel(cls);
  const kind = cardKindLabel(cls);

  const handleOpen = () =>
    trackSelectItem({
      classId: cls.id, className: cls.title, classStyle: cls.style,
      teacherId: cls.teacher.id, listName,
    });

  const image = (
    <SmartImage
      src={cls.coverImage || '/logo.png'}
      alt=""
      fill
      sizes={layout === 'carousel' ? '252px' : '96px'}
      className="object-cover"
      style={{ objectPosition: cls.coverImagePosition || '50% 50%', transform: `scale(${cls.coverImageZoom || 1})` }}
    />
  );

  const flag = country && (
    <span
      className={`absolute top-2 left-2 rounded-full bg-white/90 backdrop-blur-sm shadow-xs flex items-center justify-center ${
        layout === 'carousel' ? 'w-7 h-7 text-[14px]' : 'w-6 h-6 text-[12px]'
      }`}
      title={`Clase en ${country.name}`}
      aria-label={`Clase en ${country.name}`}
    >
      {country.flag}
    </span>
  );

  const bookmark = !isExpired && (
    <button
      type="button"
      onClick={() => setSaved(s => !s)}
      aria-label={saved ? 'Guardado' : 'Guardar clase'}
      className={`z-10 absolute w-8 h-8 rounded-full flex items-center justify-center transition-[background-color,color] active:scale-90 ${
        layout === 'carousel'
          ? `top-2 right-2 ${saved ? 'bg-neutral-900 text-white' : 'bg-black/30 text-white backdrop-blur-sm'}`
          : `top-0 right-0 ${saved ? 'text-primary' : 'text-neutral-500'}`
      }`}
    >
      <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
    </button>
  );

  const price = cls.offerPrice ? (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[15px] font-extrabold text-primary">{formatPrice(cls.priceType, cls.offerPrice, cls.currency)}</span>
      <span className="text-[12px] text-neutral-400 line-through">{formatPrice(cls.priceType, cls.price, cls.currency)}</span>
    </span>
  ) : (
    <span className="text-[15px] font-extrabold text-neutral-900">{formatPrice(cls.priceType, cls.price, cls.currency)}</span>
  );

  const titleLink = (
    <Link
      href={classUrl(cls)}
      prefetch={false}
      onClick={handleOpen}
      className="after:absolute after:inset-0 after:content-['']"
    >
      {cls.title}
    </Link>
  );

  const whenLine = when && (
    <div className={`flex items-center gap-1.5 text-[12.5px] ${isExpired ? 'text-neutral-500' : 'text-neutral-800 font-medium'}`}>
      <Calendar className="w-3.5 h-3.5 shrink-0 text-primary" aria-hidden="true" />
      <span className="truncate">{when}</span>
    </div>
  );

  const placeLine = place && (
    <div className="flex items-center gap-1.5 text-[12.5px] text-neutral-600">
      <MapPin className="w-3.5 h-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
      <span className="truncate">{place}</span>
    </div>
  );

  if (layout === 'carousel') {
    return (
      <article className="relative w-full">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-100">
          {image}
          {isExpired && <div className="absolute inset-0 bg-black/20 pointer-events-none" />}
          {flag}
          {isExpired && <span className="badge-gray text-[11px] absolute top-2 left-11">Finalizada</span>}
          <span className="absolute left-2.5 bottom-2.5 text-[11px] font-bold bg-white/95 text-neutral-900 px-2.5 py-1 rounded-full">
            {cls.style}
          </span>
          {bookmark}
        </div>
        <div className="pt-2.5 px-0.5 flex flex-col gap-0.5">
          <div className="text-[12.5px] text-neutral-500 truncate">{kind}</div>
          <h3 className="font-bold text-neutral-900 text-[15px] leading-snug truncate">{titleLink}</h3>
          {placeLine}
          {whenLine}
          <div className="mt-0.5 flex items-baseline">{price}</div>
        </div>
      </article>
    );
  }

  return (
    <article className="relative flex gap-3 py-3 border-b border-neutral-100 last:border-b-0">
      <div className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-neutral-100">
        {image}
        {isExpired && <div className="absolute inset-0 bg-black/20 pointer-events-none" />}
        {flag}
      </div>
      <div className="relative min-w-0 flex-1 flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5 text-[12px] text-neutral-500 pr-8 min-w-0">
          <span className="font-bold text-primary-dark shrink-0">{cls.style}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{kind}</span>
        </div>
        <h3 className="font-bold text-neutral-900 text-[15px] leading-snug line-clamp-2 pr-8">{titleLink}</h3>
        {isExpired && <span className="badge-gray text-[11px] self-start">Finalizada</span>}
        {whenLine}
        {placeLine}
        <div className="mt-0.5 flex items-baseline">{price}</div>
        {matchBadges && matchBadges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {matchBadges.slice(0, 2).map(b => (
              <span key={b} className="inline-flex items-center gap-1 text-[11px] font-semibold bg-primary-bg text-primary px-2 py-0.5 rounded-full border border-primary/20">
                <Sparkles className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                {b}
              </span>
            ))}
          </div>
        )}
        {bookmark}
      </div>
    </article>
  );
}
