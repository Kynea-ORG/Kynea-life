'use client';
import { useRef, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import SmartImage from '@/components/SmartImage';
import GoogleMap, { type MapPin } from '@/components/GoogleMap';
import { MapPin as MapPinIcon, Building2, X, ChevronRight, List } from 'lucide-react';
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
export default function ClasesMapView({
  classes,
  academias = [],
  onShowList,
}: {
  classes: DanceClass[];
  academias?: Teacher[];
  /** Below `lg` the list panel doesn't fit next to the map (see the grid
   * below), so it's dropped entirely there and this view is map-only — the
   * floating button (bottom, mobile-only) calls back up to the parent
   * (ClassBrowser) to switch to its own Lista view instead. Desktop is
   * unaffected: the list panel is always visible there regardless. */
  onShowList: () => void;
}) {
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
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Siempre completos — alimentan los pines del mapa y el lookup de
  // renderPopup. Si esto se filtrara por zona, GoogleMap perdería del todo
  // los pines fuera de vista (su `pinsRef` solo conoce lo que le llega por
  // props) y un futuro pan de vuelta nunca podría volver a mostrarlos.
  const validClasses = useMemo(() => classes.filter(c => c.lat != null && c.lng != null), [classes]);
  const validAcademias = useMemo(() => academias.filter(a => a.venueLat != null && a.venueLng != null), [academias]);

  const pins = useMemo<MapPin[]>(() => {
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
    return [...classPins, ...academiaPins];
  }, [validClasses, validAcademias]);

  const handleVisibleChange = useCallback((nextVisible: Set<string>) => {
    setVisibleIds(prev => {
      if (prev && prev.size === nextVisible.size) {
        let same = true;
        for (const id of nextVisible) {
          if (!prev.has(id)) { same = false; break; }
        }
        if (same) return prev;
      }
      return nextVisible;
    });
  }, []);

  // Recortados por zona visible — solo para las filas de la lista.
  const zoneFilterActive = searchOnMove && visibleIds !== null;
  const listClasses = zoneFilterActive ? validClasses.filter(c => visibleIds!.has(`clase-${c.id}`)) : validClasses;
  const listAcademias = zoneFilterActive ? validAcademias.filter(a => visibleIds!.has(`academia-${a.id}`)) : validAcademias;

  function handlePinClick(id: string | null) {
    setSelectedId(id);
    if (id) itemRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderPopup(pinId: string, close: () => void) {
    if (pinId.startsWith('clase-')) {
      const cls = validClasses.find(c => `clase-${c.id}` === pinId);
      if (!cls) return null;
      return (
        <div className="relative group">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              close();
            }}
            className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 hover:bg-white shadow-sm flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors active:scale-90"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>

          <Link href={classUrl(cls)} className="block p-3">
            <div className="flex gap-3">
              <div className="relative w-28 shrink-0 rounded-lg overflow-hidden">
                <SmartImage src={cls.coverImage || '/logo.png'} alt={cls.title} fill sizes="112px" className="object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col pr-6">
                <p className="text-[11px] font-bold text-primary">{cls.style}</p>
                <h3 className="font-bold text-neutral-900 text-[14px] leading-snug line-clamp-2 mt-0.5 group-hover:text-primary transition-colors">{cls.title}</h3>
                <p className="text-[12px] text-neutral-500 mt-0.5">{cls.teacher.name} · {cls.district}</p>
                <div className="mt-auto pt-1.5">
                  <span className="text-[14px] font-bold text-neutral-900">{formatPrice(cls.priceType, cls.offerPrice ?? cls.price, cls.currency)}</span>
                  <p className="text-[11px] text-neutral-500 truncate">{formatTimeSlots(cls.timeSlots).split(' | ')[0]}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-1 text-[12px] font-semibold text-primary group-hover:text-primary-dark pt-2.5 mt-2.5 border-t border-neutral-100">
              Ver clase <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      );
    }

    const academia = validAcademias.find(a => `academia-${a.id}` === pinId);
    if (!academia) return null;
    return (
      <div className="relative group">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            close();
          }}
          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 hover:bg-white shadow-sm flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors active:scale-90"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        <Link href={`/profesores/${academia.slug}`} className="block p-3">
          <div className="flex items-start gap-3 pr-6">
            <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-neutral-100 flex items-center justify-center">
              {academia.photo ? (
                <SmartImage src={academia.photo} alt={academia.name} fill sizes="56px" className="object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <Building2 className="w-5 h-5 text-neutral-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="badge-pink text-[10px]">Academia</span>
              <h3 className="font-bold text-neutral-900 text-[14px] leading-snug mt-0.5 line-clamp-1 group-hover:text-primary transition-colors">{academia.name}</h3>
              <p className="text-[12px] text-neutral-500 mt-0.5">{academia.venueDistrict}</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1 text-[12px] font-semibold text-primary group-hover:text-primary-dark pt-2.5 mt-2.5 border-t border-neutral-100">
            Ver perfil <ChevronRight className="w-3.5 h-3.5" />
          </div>
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
    <div className="relative grid lg:grid-cols-[380px_1fr] gap-5 h-full lg:h-[calc(100vh-220px)] min-h-[380px] w-full">
      {/* Desktop-only — below `lg` this view is map-only (see `onShowList`
          doc comment above), so this whole panel is dropped there instead
          of being a second, redundant "list" behind a mobile sub-toggle. */}
      <div className="hidden lg:flex overflow-y-auto flex-col gap-3 pr-1">
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
              onClick={() => setSelectedId(id)}
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
              onClick={() => setSelectedId(id)}
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

      <div className="relative rounded-none lg:rounded-xl overflow-hidden border-0 lg:border lg:border-neutral-200 block h-full">
        <GoogleMap
          pins={pins}
          selectedPinId={selectedId}
          hoveredPinId={hoveredId}
          onPinClick={handlePinClick}
          onVisibleChange={handleVisibleChange}
          renderPopup={renderPopup}
          gestureHandling="greedy"
        />
        <label className="absolute left-3 top-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-900 bg-white text-[12px] font-bold cursor-pointer shadow-[0_2px_8px_rgba(13,13,13,.1)]">
          <input
            type="checkbox"
            checked={searchOnMove}
            onChange={e => setSearchOnMove(e.target.checked)}
            className="w-[14px] h-[14px] accent-primary cursor-pointer"
          />
          Buscar al mover el mapa
        </label>
      </div>

      {/* Botón flotante — solo mobile (el panel de la izquierda no existe
          ahí). Su contraparte simétrica es el botón "Mapa" que ClassBrowser
          muestra sobre su grilla normal cuando está en Lista — un solo
          botón por pantalla para cruzar a la otra vista. */}
      <button
        type="button"
        onClick={onShowList}
        className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-neutral-900 text-white text-[13px] font-semibold px-4 py-2.5 rounded-full shadow-lg active:scale-[0.97] transition-transform"
      >
        <List className="w-4 h-4" /> Lista
      </button>
    </div>
  );
}
