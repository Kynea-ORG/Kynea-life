'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import SmartImage from '@/components/SmartImage';
import GoogleMap, { type MapPin } from '@/components/GoogleMap';
import { MapPin as MapPinIcon, Building2 } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { classUrl } from '@/lib/classes/helpers';
import type { DanceClass, Teacher } from '@/lib/types';

// Vista dividida tipo Airbnb: mapa real (un solo load de Maps JS por
// activación de esta vista, no por tarjeta — ver MapPreview.tsx para el
// patrón de costo cero usado en las tarjetas normales) + lista de clases y
// academias sincronizada con los pines. Reemplaza la antigua /mapa (CSS
// falso, sin academias) — ver app/mapa/page.tsx, que ahora redirige acá.
export default function ClasesMapView({ classes, academias }: { classes: DanceClass[]; academias: Teacher[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const classPins: MapPin[] = classes
    .filter(c => c.lat != null && c.lng != null)
    .map(c => ({ id: `clase-${c.id}`, lat: c.lat!, lng: c.lng!, title: c.title }));
  const academiaPins: MapPin[] = academias
    .filter(a => a.venueLat != null && a.venueLng != null)
    .map(a => ({ id: `academia-${a.id}`, lat: a.venueLat!, lng: a.venueLng!, title: a.name }));
  const pins = [...classPins, ...academiaPins];

  function handlePinClick(id: string) {
    setSelectedId(id);
    itemRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  if (pins.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="text-4xl mb-4">🗺️</p>
        <h3 className="text-[20px] font-bold text-neutral-900 mb-2">Nada con ubicación por ahora</h3>
        <p className="text-neutral-500 text-[14px] max-w-sm mx-auto">
          Ninguna clase o academia con estos filtros tiene una dirección con coordenadas todavía.
        </p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-5 h-[calc(100vh-220px)] min-h-[420px]">
      <div className="overflow-y-auto flex flex-col gap-3 pr-1">
        {classes.filter(c => c.lat != null && c.lng != null).map(cls => {
          const id = `clase-${cls.id}`;
          return (
            <div
              key={id}
              ref={el => { if (el) itemRefs.current.set(id, el); }}
              onMouseEnter={() => setSelectedId(id)}
              className={`flex gap-3 p-3 rounded-xl border transition-colors ${
                selectedId === id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'
              }`}
            >
              <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                <SmartImage src={cls.coverImage || '/logo.png'} alt={cls.title} fill sizes="64px" className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <Link href={classUrl(cls)} className="font-bold text-neutral-900 text-[14px] leading-snug hover:underline line-clamp-1">
                  {cls.title}
                </Link>
                <p className="text-[12px] text-neutral-500 mt-0.5">{cls.teacher.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[12px] text-neutral-500 flex items-center gap-1">
                    <MapPinIcon className="w-3 h-3" /> {cls.district}
                  </span>
                  <span className="text-[12px] font-bold text-neutral-900">{formatPrice(cls.priceType, cls.price, cls.currency)}</span>
                </div>
              </div>
            </div>
          );
        })}
        {academias.filter(a => a.venueLat != null && a.venueLng != null).map(academia => {
          const id = `academia-${academia.id}`;
          return (
            <div
              key={id}
              ref={el => { if (el) itemRefs.current.set(id, el); }}
              onMouseEnter={() => setSelectedId(id)}
              className={`flex gap-3 p-3 rounded-xl border transition-colors ${
                selectedId === id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'
              }`}
            >
              <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-neutral-100 flex items-center justify-center">
                {academia.photo ? (
                  <SmartImage src={academia.photo} alt={academia.name} fill sizes="64px" className="object-cover" />
                ) : (
                  <Building2 className="w-5 h-5 text-neutral-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/profesores/${academia.slug}`} className="font-bold text-neutral-900 text-[14px] leading-snug hover:underline line-clamp-1">
                  {academia.name}
                </Link>
                <span className="badge-pink text-[10px] mt-0.5 inline-block">Academia</span>
                <p className="text-[12px] text-neutral-500 flex items-center gap-1 mt-1">
                  <MapPinIcon className="w-3 h-3" /> {academia.venueDistrict}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl overflow-hidden border border-neutral-200 order-first lg:order-none h-[45vh] lg:h-auto">
        <GoogleMap pins={pins} onPinClick={handlePinClick} />
      </div>
    </div>
  );
}
