'use client';
import { useState } from 'react';
import { Calendar, Clock, MapPin, Maximize2 } from 'lucide-react';
import SmartImage from '@/components/SmartImage';
import GoogleMap from '@/components/GoogleMap';
import { detailWhenTile, detailVenueTile } from '@/lib/classes/detailInfo';
import type { DanceClass } from '@/lib/types';

// Dos recuadros bajo la foto del detalle en mobile (solo mobile, como los de Vrbo):
//  · "Cuándo": dos bloques con su etiqueta, INICIA (fecha grande) y HORARIO (días y horas), para que se
//    entienda de un vistazo que hay horarios. Ocupa el lugar del puntaje de Vrbo (Kynea no tiene reseñas).
//  · Mini mapa: igual que MapPreview, usa la imagen estática del mapa si ya está guardada (mapImageUrl) y, si
//    no, pinta el mapa real (sin controles ni gestos). Al tocarlo baja a "Dónde es". Sin coordenadas queda un
//    fondo liso con el pin (no se simula un mapa); sin coordenadas, local ni dirección no se muestra y
//    "Cuándo" ocupa todo el ancho.
// No muestra puntaje ni reseñas: hoy no hay de dónde sacarlos.
// Pin sobre fondo liso: se usa con la imagen estática, sin coordenadas o si el mapa real no carga.
function MapPinBadge() {
  return (
    <span className="absolute left-1/2 top-6 -translate-x-1/2 w-8 h-8 rounded-full bg-white border border-neutral-900 flex items-center justify-center shadow-sm">
      <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
    </span>
  );
}

export default function ClassQuickFacts({ cls, isExpired }: { cls: DanceClass; isExpired: boolean }) {
  const [showAllSlots, setShowAllSlots] = useState(false);
  const when = detailWhenTile(cls, isExpired);
  const hasCoords = cls.lat != null && cls.lng != null;
  const hasMap = hasCoords || !!cls.venueName || !!cls.address;
  if (!when && !hasMap) return null;

  const venue = detailVenueTile(cls);
  const multi = !!when && when.extraSlots.length > 0;
  const goToLocation = () => document.getElementById('donde-es')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const tone = when?.muted ? 'bg-neutral-100 border-neutral-200' : 'bg-primary-bg border-primary/20';
  const label = `flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.07em] ${when?.muted ? 'text-neutral-500' : 'text-primary-dark'}`;
  const whenClass = `relative min-w-0 rounded-2xl border p-3.5 flex flex-col gap-2.5 text-left ${tone}`;

  const whenBody = when && (
    <>
      {when.date && (
        <span className="flex flex-col gap-1">
          <span className={label}><Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />{when.date.label}</span>
          <span className={`block text-[22px] min-[400px]:text-[24px] font-black leading-none tracking-tight whitespace-nowrap ${when.muted ? 'text-neutral-600' : 'text-neutral-900'}`}>
            {when.date.big}
          </span>
        </span>
      )}
      {when.date && when.schedule && <span className={`block h-px ${when.muted ? 'bg-neutral-300' : 'bg-primary/20'}`} />}
      {when.schedule && (
        <span className="flex flex-col gap-1">
          <span className={label}><Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />HORARIO</span>
          {showAllSlots ? (
            <span className="flex flex-col gap-0.5 text-[12.5px] font-semibold leading-snug text-neutral-700">
              {when.extraSlots.map(s => <span key={s}>{s}</span>)}
            </span>
          ) : (
            <>
              <span className="block text-[13px] font-semibold leading-tight text-neutral-600">{when.schedule.days}</span>
              <span className="block text-[16px] font-extrabold leading-tight text-neutral-900 whitespace-nowrap">{when.schedule.time}</span>
              {when.schedule.more > 0 && (
                <span className="self-start mt-0.5 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-primary-dark">
                  +{when.schedule.more} {when.schedule.more === 1 ? 'horario' : 'horarios'}
                </span>
              )}
            </>
          )}
        </span>
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
          className="relative min-h-[150px] min-w-0 rounded-2xl border border-neutral-200 overflow-hidden bg-neutral-100 text-left"
        >
          {cls.mapImageUrl ? (
            <SmartImage src={cls.mapImageUrl} alt="" fill sizes="50vw" className="object-cover" />
          ) : hasCoords ? (
            // El mapa real, solo de adorno: sin controles ni gestos y sin capturar el toque (lo recibe el botón).
            <div className="absolute inset-0 pointer-events-none">
              <GoogleMap
                pins={[{ id: 'quick-facts', lat: cls.lat!, lng: cls.lng!, title: venue.title }]}
                controls={false}
                gestureHandling="none"
                errorFallback={<MapPinBadge />}
                className="w-full h-full"
              />
            </div>
          ) : null}
          {!(hasCoords && !cls.mapImageUrl) && <MapPinBadge />}
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
