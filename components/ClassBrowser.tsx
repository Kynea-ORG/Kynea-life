'use client';
import { useState, useEffect, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, X, Loader2, ArrowUp, List, Map as MapIcon } from 'lucide-react';
import Header from '@/components/Header';
import ClassCard from '@/components/ClassCard';
import FilterPanel from '@/components/FilterPanel';
import type { DanceClass, Teacher } from '@/lib/types';
import { useClassFilters } from '@/lib/hooks/useClassFilters';
import { useDelayedUnmount } from '@/lib/hooks/useDelayedUnmount';
import ClasesMapView from '@/components/ClasesMapView';

interface ClassBrowserProps {
  /** Route to sync filters into via router.replace, e.g. '/clases' or '/categorias/heels'. */
  baseUrl: string;
  initialClasses: DanceClass[];
  levels?: string[];
  /** Whether the style dimension is user-selectable. Off on a category-locked page, whose classes are already server-filtered to one style. */
  includeStyles: boolean;
  /** Required when includeStyles is true — the full catalog to populate the style filter. */
  danceStyles?: string[];
  searchPlaceholder: string;
  renderResultsCount: (count: number, isPending: boolean) => ReactNode;
  emptyText: string;
  /** Rendered between the header and the sticky search bar — e.g. a category hero banner. */
  topSlot?: ReactNode;
  /** Identifies this listing surface for select_item tracking — see trackSelectItem in lib/analytics.ts. */
  listName: string;
  /** Shows the Lista/Mapa toggle — off by default so category-locked pages
   * (which don't receive `academias`) don't suddenly grow a map option. */
  enableMapView?: boolean;
  /** Academias with real coordinates, for pins in the Mapa view — see fetchAcademiasWithLocation. */
  academias?: Teacher[];
}

export default function ClassBrowser({
  baseUrl,
  initialClasses,
  levels = [],
  includeStyles,
  danceStyles = [],
  searchPlaceholder,
  renderResultsCount,
  emptyText,
  topSlot,
  listName,
  enableMapView = false,
  academias = [],
}: ClassBrowserProps) {
  const {
    query, filters, isPending, results, activeCount,
    handleQueryChange, handleFiltersChange, handleClearAll,
  } = useClassFilters({ initialClasses, baseUrl, includeStyles });

  // `?vista=mapa` opens straight into the map view — used by /mapa's redirect
  // (see app/mapa/page.tsx) so old links/bookmarks still land on a map.
  const searchParams = useSearchParams();
  const [view, setView] = useState<'lista' | 'mapa'>(
    enableMapView && searchParams.get('vista') === 'mapa' ? 'mapa' : 'lista'
  );
  // La vista Mapa se sale del ancho fijo de 1200px de la lista normal — con
  // el sidebar de filtros + un panel de 380px, el mapa quedaba angosto en
  // pantallas grandes. En Mapa el sidebar se oculta (los filtros pasan al
  // mismo botón/modal que ya existe para mobile, ahora también en desktop)
  // y el contenedor usa casi todo el ancho disponible.
  const isMapView = enableMapView && view === 'mapa';
  const [showFilters, setShowFilters] = useState(false);
  const shouldRenderFilters = useDelayedUnmount(showFilters, 200);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShowScrollTop(window.scrollY > 480);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      {topSlot}

      {/* Search bar */}
      <div className="bg-white border-b border-neutral-200 sticky top-[64px] z-40">
        <div className={`mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 ${isMapView ? 'max-w-[1800px]' : 'max-w-[1200px]'}`}>
          <div className="flex-1 min-w-0 flex items-center gap-2.5 bg-white border border-neutral-200 rounded-btn px-4 py-2.5 hover:border-neutral-900 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-[border-color,box-shadow]">
            <Search className="w-4 h-4 text-neutral-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 min-w-0 text-[15px] text-neutral-800 placeholder:text-neutral-400 bg-transparent outline-none"
            />
            {query && (
              <button onClick={() => handleQueryChange('')} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {enableMapView && (
            // Solo desktop — en mobile cada vista tiene su propio botón
            // flotante para cruzar a la otra (ver más abajo y
            // ClasesMapView's "Ver lista"/"Ver mapa"), así que este switch
            // quedaba duplicando esa misma función.
            <div className="hidden lg:flex items-center gap-1 bg-neutral-100 rounded-xl p-1 shrink-0">
              {(['lista', 'mapa'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`flex items-center gap-1.5 text-[13px] font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors ${
                    view === v ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-700'
                  }`}
                >
                  {v === 'lista' ? <List className="w-3.5 h-3.5" /> : <MapIcon className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{v === 'lista' ? 'Lista' : 'Mapa'}</span>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 text-[13px] font-bold px-4 py-2.5 rounded-btn border border-neutral-900 bg-white text-neutral-900 hover:bg-neutral-50 transition-colors active:scale-[0.97] ${isMapView ? '' : 'md:hidden'}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filtros</span>
            {activeCount > 0 && (
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-primary-bg text-primary-dark">{activeCount}</span>
            )}
          </button>
        </div>

        {(filters.styles.length > 0 || filters.levels.length > 0) && (
          <div className={`mx-auto px-6 pb-3 flex gap-2 overflow-x-auto ${isMapView ? 'max-w-[1800px]' : 'max-w-[1200px]'}`}>
            {filters.styles.map(s => (
              <span key={s} className="flex items-center gap-1 text-[13px] bg-primary text-white font-medium px-3 py-1 rounded-full whitespace-nowrap">
                {s}
                <button
                  onClick={() => handleFiltersChange({ ...filters, styles: filters.styles.filter(x => x !== s) })}
                  className="p-0.5 rounded-full hover:bg-white/20 active:scale-90 transition-[background-color,transform]"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {filters.levels.map(l => (
              <span key={l} className="flex items-center gap-1 text-[13px] bg-primary text-white font-medium px-3 py-1 rounded-full whitespace-nowrap">
                {l}
                <button
                  onClick={() => handleFiltersChange({ ...filters, levels: filters.levels.filter(x => x !== l) })}
                  className="p-0.5 rounded-full hover:bg-white/20 active:scale-90 transition-[background-color,transform]"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={`mx-auto px-4 sm:px-6 py-8 flex gap-8 ${isMapView ? 'max-w-[1800px]' : 'max-w-[1200px]'}`}>
        {/* Sidebar — oculto en vista Mapa para dejarle todo el ancho al mapa;
            sus filtros siguen disponibles vía el mismo botón/modal de abajo,
            que en Mapa se muestra también en desktop (ver isMapView). */}
        {!isMapView && (
          <aside className="hidden md:block w-60 shrink-0">
            <div className="sticky top-36 max-h-[calc(100vh-9rem-2rem)] flex flex-col">
              <h3 className="font-bold text-neutral-900 text-[15px] mb-4 shrink-0">Filtros</h3>
              <div className="overflow-y-auto pr-1 -mr-1">
                <FilterPanel filters={filters} onChange={handleFiltersChange} danceStyles={danceStyles} levels={levels} hideStyles={!includeStyles} />
              </div>
            </div>
          </aside>
        )}

        {/* Filter modal — always md:hidden except in map view, where the
            sidebar above is gone on every breakpoint and this becomes the
            only way to reach filters. Bottom sheet on mobile; on md+ it's a
            centered dialog instead (a full-width strip sliding up from the
            bottom of a wide desktop screen read as an odd, mobile-native
            leftover — Airbnb/Vrbo use a compact centered dialog there). */}
        {shouldRenderFilters && (
          <div className={`fixed inset-0 z-50 ${isMapView ? '' : 'md:hidden'}`}>
            <div
              className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ease-out starting:opacity-0 ${showFilters ? 'opacity-100' : 'opacity-0'}`}
              onClick={() => setShowFilters(false)}
            />

            {/* Mobile: bottom sheet */}
            <div
              className={`md:hidden absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 max-h-[85vh] overflow-y-auto transition-transform duration-200 ease-out starting:translate-y-full ${showFilters ? 'translate-y-0' : 'translate-y-full'}`}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-neutral-900 text-[17px]">Filtros</h3>
                <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-neutral-100 rounded-md transition-colors active:scale-90">
                  <X className="w-5 h-5 text-neutral-600" />
                </button>
              </div>
              <FilterPanel filters={filters} onChange={handleFiltersChange} danceStyles={danceStyles} levels={levels} hideStyles={!includeStyles} />
              <button onClick={() => setShowFilters(false)} className="btn-dark w-full mt-5">
                Ver {results.length} resultado{results.length !== 1 ? 's' : ''}
              </button>
            </div>

            {/* Desktop: centered dialog */}
            <div
              className={`hidden md:flex absolute inset-0 items-center justify-center p-6 pointer-events-none`}
            >
              <div
                className={`pointer-events-auto w-full max-w-md max-h-[80vh] bg-white rounded-2xl border border-neutral-200 shadow-2xl flex flex-col transition-[opacity,transform] duration-200 ease-out starting:opacity-0 starting:scale-95 ${
                  showFilters ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}
              >
                <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 shrink-0">
                  <h3 className="font-bold text-neutral-900 text-[17px]">Filtros</h3>
                  <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-neutral-100 rounded-md transition-colors active:scale-90">
                    <X className="w-5 h-5 text-neutral-600" />
                  </button>
                </div>
                <div className="px-6 py-5 overflow-y-auto">
                  <FilterPanel filters={filters} onChange={handleFiltersChange} danceStyles={danceStyles} levels={levels} hideStyles={!includeStyles} />
                </div>
                <div className="px-6 py-5 border-t border-neutral-100 shrink-0">
                  <button onClick={() => setShowFilters(false)} className="btn-dark w-full">
                    Ver {results.length} resultado{results.length !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <main className={`flex-1 min-w-0 transition-opacity duration-150 ${isPending ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between mb-6">
            <p className="text-[15px] text-neutral-600 flex items-center gap-2">
              {isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Filtrando…</>
                : renderResultsCount(results.length, isPending)
              }
            </p>
          </div>

          {results.length === 0 && !isPending ? (
            <div className="text-center py-24 animate-fade-in">
              <p className="text-5xl mb-5 animate-pop">🕺</p>
              <h3 className="text-[24px] font-bold text-neutral-900 mb-2">Sin resultados</h3>
              <p className="text-neutral-600 text-[15px] max-w-sm mx-auto">{emptyText}</p>
              <button onClick={handleClearAll} className="btn-outline mt-6">
                Limpiar filtros
              </button>
            </div>
          ) : enableMapView && view === 'mapa' ? (
            <ClasesMapView classes={results} academias={academias} onShowList={() => setView('lista')} />
          ) : (
            // `pb-20` en mobile deja espacio para el botón flotante "Mapa"
            // de abajo — si no, tapa la última fila (mismo problema que ya
            // resolvimos en ClasesMapView para su propio toggle flotante).
            <div className={`grid sm:grid-cols-2 lg:grid-cols-3 gap-5 ${enableMapView ? 'pb-20 lg:pb-0' : ''}`}>
              {results.map(cls => <ClassCard key={cls.id} cls={cls} listName={listName} />)}
            </div>
          )}
        </main>
      </div>

      {/* Botón flotante "Mapa" — la contraparte mobile del switch de arriba
          (oculto en mobile) y del "Ver lista"/"Ver mapa" que ya tiene
          ClasesMapView del otro lado — mismo estilo, mismo gesto, un solo
          botón por pantalla para cruzar entre Lista y Mapa. */}
      {enableMapView && view === 'lista' && (
        <button
          type="button"
          onClick={() => setView('mapa')}
          className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-neutral-900 text-white text-[13px] font-semibold px-4 py-2.5 rounded-full shadow-lg active:scale-[0.97] transition-transform"
        >
          <MapIcon className="w-4 h-4" /> Mapa
        </button>
      )}

      <button
        onClick={scrollToTop}
        aria-label="Volver arriba"
        tabIndex={showScrollTop ? 0 : -1}
        className={`fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-neutral-900 text-white shadow-lg flex items-center justify-center hover:bg-neutral-800 active:scale-90 transition-[opacity,transform] duration-200 ease-out ${
          showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
        }`}
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </div>
  );
}
