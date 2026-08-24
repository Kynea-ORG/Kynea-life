'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import SmartImage from '@/components/SmartImage';
import GoogleMap, { type MapPin } from '@/components/GoogleMap';
import { MapPin as MapPinIcon, Building2, X, ChevronRight, List, Map as MapIcon } from 'lucide-react';
import { formatPrice, formatPriceShort, formatTimeSlots } from '@/lib/utils';
import { classUrl } from '@/lib/classes/helpers';
import type { DanceClass, Teacher } from '@/lib/types';

// Vista dividida tipo Airbnb: mapa real (un solo load de Maps JS por
// activación de esta vista, no por tarjeta — ver MapPreview.tsx para el
// patrón de costo cero usado en las tarjetas normales) + lista de clases y
// academias sincronizada con los pines. Reemplaza la antigua /mapa (CSS
// falso, sin academias) — ver app/mapa/page.tsx, que ahora redirige acá.
//
// Los pines llevan el precio (clases) o el nombre (academias) en una
// píldora — ver GoogleMap.tsx — y al hacer clic abren una tarjeta flotante
// sobre el mapa mismo (no solo resaltan el item en la lista lateral).
export default function ClasesMapView({ classes, academias }: { classes: DanceClass[]; academias: Teacher[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Hover en desktop solo resalta el pin (sin abrir tarjeta ni mover el
  // mapa) — el click sigue siendo el único gesto que selecciona de verdad.
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // "Buscar al mover el mapa": la lista se recorta a lo que entra en el
  // viewport actual. `visibleIds` lo mantiene GoogleMap vía onVisibleChange
  // (se sigue actualizando aunque el checkbox esté apagado, así que
  // prenderlo refleja la zona actual al toque, sin esperar al próximo pan).
  const [searchOnMove, setSearchOnMove] = useState(true);
  const [visibleIds, setVisibleIds] = useState<Set<string> | null>(null);
  // Solo importa debajo de `lg` — ahí el mapa y la lista ya no van lado a
  // lado (no entran ambos con un tamaño usable), así que se muestra uno a
  // pantalla completa por vez con un botón flotante para alternar, en vez
  // del split fijo 45vh/resto que quedaba muy apretado en mobile.
  const [mobileView, setMobileView] = useState<'mapa' | 'lista'>('mapa');
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Siempre completos — alimentan los pines del mapa y el lookup de
  // renderPopup. Si esto se filtrara por zona, GoogleMap perdería del todo
  // los pines fuera de vista (su `pinsRef` solo conoce lo que le llega por
  // props) y un futuro pan de vuelta nunca podría volver a mostrarlos.
  const validClasses = classes.filter(c => c.lat != null && c.lng != null);
  const validAcademias = academias.filter(a => a.venueLat != null && a.venueLng != null);

  // Recortados por zona visible — solo para las filas de la lista.
  const zoneFilterActive = searchOnMove && visibleIds !== null;
  const listClasses = zoneFilterActive ? validClasses.filter(c => visibleIds!.has(`clase-${c.id}`)) : validClasses;
  const listAcademias = zoneFilterActive ? validAcademias.filter(a => visibleIds!.has(`academia-${a.id}`)) : validAcademias;

  const classPins: MapPin[] = validClasses.map(c => ({
    id: `clase-${c.id}`,
    lat: c.lat!,
    lng: c.lng!,
    title: c.title,
    kind: 'clase',
    photo: c.coverImage || undefined,
    pillLabel: formatPriceShort(c.priceType, c.offerPrice ?? c.price, c.currency),
  }));
  const academiaPins: MapPin[] = validAcademias.map(a => ({
    id: `academia-${a.id}`,
    lat: a.venueLat!,
    lng: a.venueLng!,
    title: a.name,
    kind: 'academia',
    photo: a.photo || undefined,
    pillLabel: a.name.length > 18 ? `${a.name.slice(0, 17)}…` : a.name,
  }));
  const pins = [...classPins, ...academiaPins];

  function handlePinClick(id: string | null) {
    setSelectedId(id);
    if (id) itemRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Tocar una fila de la lista en mobile también cambia a la vista Mapa —
  // si no, el pin se selecciona y abre su tarjeta "detrás" de la lista, sin
  // que se vea. En desktop `mobileView` no tiene efecto (ambos paneles
  // siguen visibles siempre a partir de `lg`).
  function selectFromList(id: string) {
    setSelectedId(id);
    setMobileView('mapa');
  }

  function renderPopup(pinId: string, close: () => void) {
    if (pinId.startsWith('clase-')) {
      const cls = validClasses.find(c => `clase-${c.id}` === pinId);
      if (!cls) return null;
      return (
        <div>
          <div className="relative h-28">
            <SmartImage src={cls.coverImage || '/logo.png'} alt={cls.title} fill sizes="288px" className="object-cover" />
            <button onClick={close} className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors active:scale-90">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-3">
            <p className="text-[11px] font-bold text-primary">{cls.style}</p>
            <h3 className="font-bold text-neutral-900 text-[14px] leading-snug line-clamp-1">{cls.title}</h3>
            <p className="text-[12px] text-neutral-500 mt-0.5">{cls.teacher.name} · {cls.district}</p>
            <div className="flex mt-2.5 pt-2.5 border-t border-neutral-100">
              <div className="flex-1 pr-3 border-r border-neutral-100">
                <p className="text-[10px] text-neutral-400">Precio</p>
                <p className="text-[13px] font-bold text-neutral-900 mt-0.5">{formatPrice(cls.priceType, cls.offerPrice ?? cls.price, cls.currency)}</p>
              </div>
              <div className="flex-1 pl-3 min-w-0">
                <p className="text-[10px] text-neutral-400">Horario</p>
                <p className="text-[12px] font-semibold text-neutral-900 mt-0.5 truncate">{formatTimeSlots(cls.timeSlots).split(' | ')[0]}</p>
              </div>
            </div>
          </div>
          <Link href={classUrl(cls)} className="flex items-center justify-center gap-1 text-[12px] font-semibold text-primary hover:text-primary-dark py-2.5 border-t border-neutral-100">
            Ver clase <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      );
    }

    const academia = validAcademias.find(a => `academia-${a.id}` === pinId);
    if (!academia) return null;
    return (
      <div>
        <div className="flex items-start gap-3 p-3">
          <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-neutral-100 flex items-center justify-center">
            {academia.photo ? (
              <SmartImage src={academia.photo} alt={academia.name} fill sizes="56px" className="object-cover" />
            ) : (
              <Building2 className="w-5 h-5 text-neutral-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="badge-pink text-[10px]">Academia</span>
            <h3 className="font-bold text-neutral-900 text-[14px] leading-snug mt-0.5 line-clamp-1">{academia.name}</h3>
            <p className="text-[12px] text-neutral-500 mt-0.5">{academia.venueDistrict}</p>
          </div>
          <button onClick={close} className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-neutral-400 hover:bg-neutral-100 transition-colors active:scale-90">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <Link href={`/profesores/${academia.slug}`} className="flex items-center justify-center gap-1 text-[12px] font-semibold text-primary hover:text-primary-dark py-2.5 border-t border-neutral-100">
          Ver perfil <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
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

  const listEmpty = listClasses.length === 0 && listAcademias.length === 0;

  return (
    <div className="relative grid lg:grid-cols-[380px_1fr] gap-5 h-[calc(100vh-220px)] min-h-[420px]">
      {/* `pb-20` on mobile reserves room below the last row for the floating
          "Ver lista"/"Ver mapa" toggle — without it that button (same
          bottom-anchored spot) sits on top of the last item instead of
          below the list. */}
      <div className={`overflow-y-auto flex-col gap-3 pr-1 pb-20 lg:pb-0 lg:flex ${mobileView === 'lista' ? 'flex' : 'hidden'}`}>
        {zoneFilterActive && (
          <p className="text-[13px] text-neutral-500 px-0.5">
            <strong className="text-neutral-900">{listClasses.length + listAcademias.length}</strong> clase{listClasses.length + listAcademias.length !== 1 ? 's' : ''} en esta zona
          </p>
        )}
        {listEmpty && (
          <div className="text-center py-10 px-4">
            <p className="text-[13px] text-neutral-500">Nada por aquí — mueve el mapa para explorar otra zona.</p>
          </div>
        )}
        {listClasses.map(cls => {
          const id = `clase-${cls.id}`;
          return (
            <div
              key={id}
              ref={el => { if (el) itemRefs.current.set(id, el); }}
              onClick={() => selectFromList(id)}
              onMouseEnter={() => setHoveredId(id)}
              onMouseLeave={() => setHoveredId(cur => (cur === id ? null : cur))}
              className={`flex gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                selectedId === id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                <SmartImage src={cls.coverImage || '/logo.png'} alt={cls.title} fill sizes="64px" className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wide text-primary-dark bg-primary-bg px-2 py-0.5 rounded-full">{cls.style}</span>
                <Link href={classUrl(cls)} className="block font-bold text-neutral-900 text-[14px] leading-snug hover:underline line-clamp-1 mt-1">
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
        {listAcademias.map(academia => {
          const id = `academia-${academia.id}`;
          return (
            <div
              key={id}
              ref={el => { if (el) itemRefs.current.set(id, el); }}
              onClick={() => selectFromList(id)}
              onMouseEnter={() => setHoveredId(id)}
              onMouseLeave={() => setHoveredId(cur => (cur === id ? null : cur))}
              className={`flex gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                selectedId === id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'
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

      <div className={`relative rounded-xl overflow-hidden border border-neutral-200 lg:block lg:h-auto ${mobileView === 'mapa' ? 'block h-full' : 'hidden'}`}>
        <GoogleMap
          pins={pins}
          selectedPinId={selectedId}
          hoveredPinId={hoveredId}
          onPinClick={handlePinClick}
          onVisibleChange={setVisibleIds}
          renderPopup={renderPopup}
        />
        <label className="absolute left-4 top-4 z-10 flex items-center gap-2 px-3.5 py-2 rounded-full border border-neutral-900 bg-white text-[12.5px] font-bold cursor-pointer shadow-[0_3px_12px_rgba(13,13,13,.1)]">
          <input
            type="checkbox"
            checked={searchOnMove}
            onChange={e => setSearchOnMove(e.target.checked)}
            className="w-[15px] h-[15px] accent-primary cursor-pointer"
          />
          Buscar al mover el mapa
        </label>
      </div>

      {/* Toggle flotante — solo mobile, donde mapa y lista ya no van lado a
          lado. En desktop el split de la izquierda ya muestra ambos. */}
      <button
        type="button"
        onClick={() => setMobileView(v => (v === 'mapa' ? 'lista' : 'mapa'))}
        className="lg:hidden absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-neutral-900 text-white text-[13px] font-semibold px-4 py-2.5 rounded-full shadow-lg active:scale-[0.97] transition-transform"
      >
        {mobileView === 'mapa' ? <><List className="w-4 h-4" /> Ver lista</> : <><MapIcon className="w-4 h-4" /> Ver mapa</>}
      </button>
    </div>
  );
}
