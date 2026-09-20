'use client';
import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, X, Loader2, ArrowUp, ArrowLeft, List, Map as MapIcon, MapPin } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ClassCard from '@/components/ClassCard';
import FilterPanel from '@/components/FilterPanel';
import type { DanceClass, Teacher } from '@/lib/types';
import type { LocationOption } from '@/lib/catalog/queries';
import { useClassFilters } from '@/lib/hooks/useClassFilters';
import { useDelayedUnmount } from '@/lib/hooks/useDelayedUnmount';
import ClasesMapView from '@/components/ClasesMapView';
import LocationAutocomplete from '@/components/LocationAutocomplete';
import { trackMapViewToggle } from '@/lib/analytics';

interface ClassBrowserProps {
  /** Route to sync filters into via router.replace, e.g. '/clases' or '/categorias/heels'. */
  baseUrl: string;
  initialClasses: DanceClass[];
  levels?: string[];
  /** Whether the style dimension is user-selectable. Off on a category-locked page, whose classes are already server-filtered to one style. */
  includeStyles: boolean;
  /** Required when includeStyles is true — the full catalog to populate the style filter. */
  danceStyles?: string[];
  /** ISO codes with at least one published class — see fetchClassCountries. */
  countries?: string[];
  searchPlaceholder: string;
  renderResultsCount: (count: number, isPending: boolean) => ReactNode;
  emptyText: string;
  /** Rendered between the header and the sticky search bar — e.g. a category hero banner. */
  topSlot?: ReactNode;
  /** When true, a toggle in the search bar allows switching to an
   * interactive map view of the filtered classes. Off on search/saved-classes
   * pages where map view doesn't make sense or isn't wanted. */
  enableMapView?: boolean;
  /** Academias to show alongside classes in map view (see ClasesMapView).
   * Ignored when enableMapView is false. */
  academias?: Teacher[];
  /** Catalog of distinct location options (districts & cities with counts). */
  locationOptions?: LocationOption[];
  /** Sentry / analytics list identifier passed through to ClassCard (e.g. 'clases_explorador', 'categoria_heels'). */
  listName?: string;
  /** Approximate fallback coordinates from GeoIP when user has no GPS */
  fallbackLocation?: { lat: number; lng: number } | null;
}

export default function ClassBrowser({
  baseUrl,
  initialClasses,
  levels = [],
  includeStyles,
  danceStyles = [],
  countries = [],
  searchPlaceholder,
  renderResultsCount,
  emptyText,
  topSlot,
  enableMapView = false,
  academias = [],
  locationOptions = [],
  listName = 'clases_explorador',
  fallbackLocation,
}: ClassBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const shouldRenderFilters = useDelayedUnmount(showFilters, 200);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // URL is the single source of truth for view mode ('lista' | 'mapa').
  const view: 'lista' | 'mapa' = enableMapView && searchParams.get('vista') === 'mapa' ? 'mapa' : 'lista';
  const isMapView = enableMapView && view === 'mapa';

  // Wraps view change so every trigger point (segmented control, mobile floating
  // button, mobile back button, ClasesMapView's own callback) tracks the
  // same way and syncs the URL seamlessly.
  function changeView(next: 'lista' | 'mapa') {
    if (next === view) return;
    trackMapViewToggle({ viewType: next, listName });

    const params = new URLSearchParams(searchParams.toString());
    if (next === 'mapa') {
      params.set('vista', 'mapa');
    } else {
      params.delete('vista');
    }
    const qs = params.toString();
    router.replace(`${baseUrl}${qs ? '?' + qs : ''}`, { scroll: false });
  }

  const {
    query,
    filters,
    results,
    isPending,
    activeCount,
    handleQueryChange,
    handleFiltersChange,
    handleClearAll,
  } = useClassFilters({
    baseUrl,
    initialClasses,
    includeStyles,
  });

  const [recenterTrigger, setRecenterTrigger] = useState(0);

  const filteredAcademias = useMemo(() => {
    return academias.filter(a => {
      if (query) {
        const q = query.toLowerCase();
        const matchesQuery =
          a.name.toLowerCase().includes(q) ||
          a.styles.some(s => s.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }
      if (filters.styles.length && !a.styles.some(s => filters.styles.includes(s))) {
        return false;
      }
      if (filters.city) {
        const normCity = filters.city.toLowerCase().replace(/provincia de | province/g, '').trim();
        if (!a.venueCity || !a.venueCity.toLowerCase().includes(normCity)) {
          return false;
        }
      }
      if (filters.district) {
        const normDist = filters.district.toLowerCase().trim();
        const aDist = (a.venueDistrict || '').toLowerCase().trim();
        const isSurco =
          (normDist === 'santiago de surco' || normDist === 'surco') &&
          (aDist === 'santiago de surco' || aDist === 'surco');
        if (aDist !== normDist && !isSurco) {
          return false;
        }
      }
      return true;
    });
  }, [academias, query, filters.styles, filters.city, filters.district]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <div className={`min-h-screen bg-white ${isMapView ? 'h-dvh flex flex-col overflow-hidden lg:h-auto lg:min-h-screen lg:block lg:overflow-visible' : ''}`}>
      <Header className={isMapView ? 'hidden lg:block' : ''} />
      {topSlot && <div className={isMapView ? 'hidden lg:block' : ''}>{topSlot}</div>}

      {/* Search bar */}
      <div className={`bg-white border-b border-neutral-200 shrink-0 sticky ${isMapView ? 'top-0 lg:top-[64px]' : 'top-[64px]'} z-40`}>
        <div className={`mx-auto px-3 sm:px-6 py-2.5 sm:py-3 ${isMapView ? 'max-w-[1800px]' : 'max-w-[1200px]'}`}>
          {/* Mobile view (< sm): 2 distinct, clean rows with fully homogenized borders */}
          <div className="flex flex-col gap-2 sm:hidden">
            {/* Fila 1: [ ← ] (si isMapView) + [ Buscador de texto ] + [ Filtros ] */}
            <div className="flex items-center gap-2 w-full">
              {isMapView && (
                <button
                  type="button"
                  onClick={() => changeView('lista')}
                  className="h-11 w-11 flex items-center justify-center rounded-btn border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 active:scale-95 transition-[border-color,background-color,transform] shrink-0"
                  aria-label="Volver a lista"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}

              <div className="flex-1 min-w-0 h-11 flex items-center gap-2.5 px-3.5 bg-white border border-neutral-200 rounded-btn hover:border-neutral-900 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-[border-color,box-shadow]">
                <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="flex-1 min-w-0 text-[14px] text-neutral-800 placeholder:text-neutral-400 bg-transparent outline-none truncate"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => handleQueryChange('')}
                    className="text-neutral-400 hover:text-neutral-600 p-0.5 rounded-full hover:bg-neutral-100 transition-colors shrink-0"
                    aria-label="Limpiar búsqueda de texto"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`h-11 px-3.5 flex items-center justify-center gap-2 text-[13px] font-bold rounded-btn border transition-[border-color,background-color,color] active:scale-[0.97] shrink-0 ${
                  activeCount > 0
                    ? 'border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800'
                    : 'border-neutral-200 bg-white text-neutral-900 hover:border-neutral-900 hover:bg-neutral-50'
                }`}
                aria-label="Abrir filtros"
              >
                <SlidersHorizontal className="w-4 h-4" />
                {activeCount > 0 && (
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-primary-bg text-primary-dark">
                    {activeCount}
                  </span>
                )}
              </button>
            </div>

            {/* Fila 2: [ Selector de ubicación (ancho completo) ] */}
            <div className="w-full">
              <LocationAutocomplete
                locationOptions={locationOptions}
                selectedCity={filters.city}
                selectedDistrict={filters.district}
                onSelectLocation={(city, district) => {
                  handleFiltersChange({ ...filters, city, district });
                  setRecenterTrigger(c => c + 1);
                }}
                onClearLocation={() => {
                  handleFiltersChange({ ...filters, city: '', district: '' });
                  setRecenterTrigger(c => c + 1);
                }}
                className="h-11 flex items-center bg-white border border-neutral-200 rounded-btn hover:border-neutral-900 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-[border-color,box-shadow]"
              />
            </div>
          </div>

          {/* Desktop / Tablet view (>= sm): 1 horizontal row with homogenized borders */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3 w-full">
            {isMapView && (
              <button
                type="button"
                onClick={() => changeView('lista')}
                className="lg:hidden h-11 w-11 flex items-center justify-center rounded-btn border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 active:scale-95 transition-[border-color,background-color,transform] shrink-0"
                aria-label="Volver a lista"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            {/* Dual search container: [ Content ] | [ Location Autocomplete ] */}
            <div className="flex-1 min-w-0 h-11 flex items-center bg-white border border-neutral-200 rounded-btn divide-x divide-neutral-100 hover:border-neutral-900 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-[border-color,box-shadow]">
              {/* Input 1: Content search */}
              <div className="flex-1 min-w-0 h-full flex items-center gap-2.5 px-3.5">
                <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="flex-1 min-w-0 text-[14px] sm:text-[15px] text-neutral-800 placeholder:text-neutral-400 bg-transparent outline-none truncate"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => handleQueryChange('')}
                    className="text-neutral-400 hover:text-neutral-600 p-0.5 rounded-full hover:bg-neutral-100 transition-colors"
                    aria-label="Limpiar búsqueda de texto"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Input 2: Location autocomplete */}
              <div className="w-56 md:w-64 lg:w-72 shrink-0 h-full">
                <LocationAutocomplete
                  locationOptions={locationOptions}
                  selectedCity={filters.city}
                  selectedDistrict={filters.district}
                  onSelectLocation={(city, district) => {
                    handleFiltersChange({ ...filters, city, district });
                    setRecenterTrigger(c => c + 1);
                  }}
                  onClearLocation={() => {
                    handleFiltersChange({ ...filters, city: '', district: '' });
                    setRecenterTrigger(c => c + 1);
                  }}
                  className="h-full"
                />
              </div>
            </div>

            {enableMapView && (
              <div className="hidden lg:flex items-center gap-1 bg-neutral-100 rounded-xl p-1 shrink-0 h-11">
                {(['lista', 'mapa'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => changeView(v)}
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
              className={`h-11 flex items-center gap-2 text-[13px] font-bold px-4 rounded-btn border transition-[border-color,background-color,color] active:scale-[0.97] shrink-0 ${isMapView ? '' : 'md:hidden'} ${
                activeCount > 0
                  ? 'border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800'
                  : 'border-neutral-200 bg-white text-neutral-900 hover:border-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filtros</span>
              {activeCount > 0 && (
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${activeCount > 0 ? 'bg-primary text-white' : 'bg-primary-bg text-primary-dark'}`}>
                  {activeCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {(filters.styles.length > 0 || filters.levels.length > 0 || filters.city || filters.district) && (
          <div className={`mx-auto px-3 sm:px-6 pb-2.5 sm:pb-3 flex gap-2 overflow-x-auto ${isMapView ? 'max-w-[1800px]' : 'max-w-[1200px]'}`}>
            {(filters.district || filters.city) && (
              <span className="flex items-center gap-1.5 text-[13px] bg-primary text-white font-medium px-3 py-1 rounded-full whitespace-nowrap">
                <MapPin className="w-3 h-3 shrink-0" />
                <span>
                  {filters.district ? (filters.city ? `${filters.district}, ${filters.city}` : filters.district) : filters.city}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    handleFiltersChange({ ...filters, city: '', district: '' });
                    setRecenterTrigger(c => c + 1);
                  }}
                  className="p-0.5 rounded-full hover:bg-white/20 active:scale-90 transition-[background-color,transform]"
                  aria-label="Quitar filtro de ubicación"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
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

      <div className={`mx-auto flex gap-8 ${isMapView ? 'flex-1 min-h-0 w-full max-w-[1800px] px-0 py-0 lg:px-6 lg:py-8' : 'max-w-[1200px] px-4 sm:px-6 py-8'}`}>
        {/* Sidebar — oculto en vista Mapa para dejarle todo el ancho al mapa;
            sus filtros siguen disponibles vía el mismo botón/modal de abajo,
            que en Mapa se muestra también en desktop (ver isMapView). */}
        {!isMapView && (
          <aside className="hidden md:block w-60 shrink-0">
            <div className="sticky top-36 max-h-[calc(100vh-9rem-2rem)] flex flex-col">
              <h3 className="font-bold text-neutral-900 text-[15px] mb-4 shrink-0">Filtros</h3>
              <div className="overflow-y-auto pr-1 -mr-1">
                <FilterPanel filters={filters} onChange={handleFiltersChange} danceStyles={danceStyles} levels={levels} countries={countries} hideStyles={!includeStyles} />
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
              <FilterPanel filters={filters} onChange={handleFiltersChange} danceStyles={danceStyles} levels={levels} countries={countries} hideStyles={!includeStyles} />
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
                  <FilterPanel filters={filters} onChange={handleFiltersChange} danceStyles={danceStyles} levels={levels} countries={countries} hideStyles={!includeStyles} />
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
        <main className={`flex-1 min-w-0 flex flex-col transition-opacity duration-150 ${isPending ? 'opacity-60' : ''}`}>
          {!isMapView && (
            <div className="flex items-center justify-between mb-6">
              <p className="text-[15px] text-neutral-600 flex items-center gap-2">
                {isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Filtrando…</>
                  : renderResultsCount(results.length, isPending)
                }
              </p>
            </div>
          )}

          {results.length === 0 && !isPending ? (
            <div className="text-center py-24 animate-fade-in">
              <p className="text-5xl mb-5 animate-pop">🕺</p>
              <h3 className="text-[24px] font-bold text-neutral-900 mb-2">Sin resultados</h3>
              <p className="text-neutral-600 text-[15px] max-w-sm mx-auto">{emptyText}</p>
              <button
                onClick={() => {
                  handleClearAll();
                  setRecenterTrigger(c => c + 1);
                }}
                className="btn-outline mt-6"
              >
                Limpiar filtros
              </button>
            </div>
          ) : enableMapView && view === 'mapa' ? (
            <ClasesMapView
              classes={results}
              academias={filteredAcademias}
              fallbackLocation={fallbackLocation}
              onShowList={() => changeView('lista')}
              listName={`${listName}_mapa`}
              recenterTrigger={recenterTrigger}
              onUserDrag={() => {
                if (filters.city || filters.district) {
                  handleFiltersChange({ ...filters, city: '', district: '' });
                }
              }}
            />
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

      {/* Solo en vista Lista — el app-shell de vista Mapa es un flex-col de
          altura fija (h-dvh overflow-hidden en mobile) donde un footer sin
          restricción competiría por esa altura y aplastaría el mapa. */}
      {!isMapView && <Footer />}

      {/* Botón flotante "Mapa" — la contraparte mobile del switch de arriba
          (oculto en mobile) y del "Ver lista"/"Ver mapa" que ya tiene
          ClasesMapView del otro lado — mismo estilo, mismo gesto, un solo
          botón por pantalla para cruzar entre Lista y Mapa. */}
      {enableMapView && view === 'lista' && (
        <button
          type="button"
          onClick={() => changeView('mapa')}
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
