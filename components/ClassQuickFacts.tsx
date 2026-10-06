'use client';
import { useState } from 'react';
import { Calendar, Clock, MapPin, Maximize2 } from 'lucide-react';
import SmartImage from '@/components/SmartImage';
import { detailWhenTile, detailVenueTile } from '@/lib/classes/detailInfo';
import type { DanceClass } from '@/lib/types';

// Dos recuadros bajo la foto del detalle en mobile (solo mobile, como los de Vrbo):
//  · "Cuándo": fecha de inicio grande + horario. Ocupa el lugar del puntaje de Vrbo (Kynea no tiene reseñas).
//  · Mini mapa: la misma imagen estática que ya usa "Ubicación" (mapImageUrl) + local y zona. Al tocarlo
//    baja a "Dónde es". Si todavía no hay imagen guardada, se muestra igual sobre un fondo liso con el pin
//    (el dónde tiene que verse en la primera pantalla; no se simula un mapa). Sin coordenadas, local ni
//    dirección no se muestra y "Cuándo" ocupa todo el ancho.
// No muestra puntaje, reseñas ni cupos: hoy no hay forma de saber esos datos.
export default function ClassQuickFacts({ cls, isExpired }: { cls: DanceClass; isExpired: boolean }) {
  const [showAllSlots, setShowAllSlots] = useState(false);
  const when = detailWhenTile(cls, isExpired);
  const hasMap = (cls.lat != null && cls.lng != null) || !!cls.venueName || !!cls.address;
  if (!when && !hasMap) return null;

  const venue = detailVenueTile(cls);
  const multi = !!when && when.extraSlots.length > 0;
  const goToLocation = () => document.getElementById('donde-es')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const tone = when?.muted
    ? 'bg-neutral-100 border-neutral-200'
    : 'bg-primary-bg border-primary/20';
  const whenClass = `relative ${hasMap ? 'min-h-[132px]' : 'min-h-[104px]'} min-w-0 rounded-2xl border p-3.5 flex flex-col justify-between gap-2 text-left ${tone}`;
  const WhenIcon = when?.label === 'HORARIO' ? Clock : Calendar;

  const whenBody = when && (
    <>
      <span className={`flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.07em] ${when.muted ? 'text-neutral-500' : 'text-primary-dark'}`}>
        <WhenIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        {when.label}
      </span>
      <span className={`block text-[22px] min-[380px]:text-[26px] font-black leading-none tracking-tight whitespace-nowrap ${when.muted ? 'text-neutral-600' : 'text-neutral-900'}`}>
        {when.big}
      </span>
      {showAllSlots ? (
        <span className="flex flex-col gap-0.5 text-[13px] font-semibold leading-snug text-neutral-700">
          {when.extraSlots.map(s => <span key={s}>{s}</span>)}
        </span>
      ) : (
        <span className="block text-[13px] font-semibold leading-snug text-neutral-700 line-clamp-2">{when.sub}</span>
      )}
    </>
  );

  return (
    <div data-testid="quick-facts" className={`lg:hidden grid gap-3 mt-3.5 ${when && hasMap ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {when && (multi ? (
        <button
          type="button"
          data-testid="when-tile"
          aria-label={showAllSlots ? 'Ocultar horarios' : 'Ver horarios'}
          aria-expanded={showAllSlots}
          onClick={() => setShowAllSlots(s => !s)}
          className={whenClass}
        >
          {whenBody}
        </button>
      ) : (
        <div data-testid="when-tile" className={whenClass}>{whenBody}</div>
      ))}

      {hasMap && (
        <button
          type="button"
          aria-label={`Ver ubicación: ${venue.title}`}
          onClick={goToLocation}
          className="relative min-h-[132px] min-w-0 rounded-2xl border border-neutral-200 overflow-hidden bg-neutral-100 text-left"
        >
          {cls.mapImageUrl && <SmartImage src={cls.mapImageUrl} alt="" fill sizes="50vw" className="object-cover" />}
          <span className="absolute left-1/2 top-5 -translate-x-1/2 w-8 h-8 rounded-full bg-white border border-neutral-900 flex items-center justify-center shadow-sm">
            <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
          </span>
          <span className="absolute right-2 top-2 w-7 h-7 rounded-full bg-white border border-neutral-200 flex items-center justify-center">
            <Maximize2 className="w-3.5 h-3.5 text-neutral-900" aria-hidden="true" />
          </span>
          <span className="absolute inset-x-0 bottom-0 bg-white/93 px-3 pt-1.5 pb-2 leading-tight">
            <span className="block text-[13px] font-bold text-neutral-900 truncate">{venue.title}</span>
            {venue.sub && <span className="block text-[12px] text-neutral-500 truncate">{venue.sub}</span>}
          </span>
        </button>
      )}
    </div>
  );
}
