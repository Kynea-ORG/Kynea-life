'use client';
import { useState, useEffect, type ReactNode } from 'react';
import { Search, SlidersHorizontal, X, Loader2, ArrowUp } from 'lucide-react';
import Header from '@/components/Header';
import ClassCard from '@/components/ClassCard';
import FilterPanel from '@/components/FilterPanel';
import type { DanceClass } from '@/lib/types';
import { useClassFilters } from '@/lib/hooks/useClassFilters';
import { useDelayedUnmount } from '@/lib/hooks/useDelayedUnmount';

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
}: ClassBrowserProps) {
  const {
    query, filters, isPending, results, activeCount,
    handleQueryChange, handleFiltersChange, handleClearAll,
  } = useClassFilters({ initialClasses, baseUrl, includeStyles });

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
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2.5 bg-neutral-50 border border-neutral-200 rounded-md px-4 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-neutral-900/8 transition-[border-color,box-shadow]">
            <Search className="w-4 h-4 text-neutral-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 text-[15px] text-neutral-800 placeholder:text-neutral-400 bg-transparent outline-none"
            />
            {query && (
              <button onClick={() => handleQueryChange('')} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 text-[15px] font-semibold px-4 py-2.5 rounded-btn border-2 transition-colors active:scale-[0.97] md:hidden ${
              activeCount > 0
                ? 'bg-neutral-900 border-neutral-900 text-white'
                : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros {activeCount > 0 && `(${activeCount})`}
          </button>
        </div>

        {(filters.styles.length > 0 || filters.levels.length > 0) && (
          <div className="max-w-[1200px] mx-auto px-6 pb-3 flex gap-2 overflow-x-auto">
            {filters.styles.map(s => (
              <span key={s} className="flex items-center gap-1 text-[13px] bg-neutral-900 text-white font-medium px-3 py-1 rounded-full whitespace-nowrap">
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
              <span key={l} className="flex items-center gap-1 text-[13px] bg-neutral-900 text-white font-medium px-3 py-1 rounded-full whitespace-nowrap">
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

      <div className="max-w-[1200px] mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar */}
        <aside className="hidden md:block w-60 shrink-0">
          <div className="sticky top-36 max-h-[calc(100vh-9rem-2rem)] flex flex-col">
            <h3 className="font-bold text-neutral-900 text-[15px] mb-4 shrink-0">Filtros</h3>
            <div className="overflow-y-auto pr-1 -mr-1">
              <FilterPanel filters={filters} onChange={handleFiltersChange} danceStyles={danceStyles} levels={levels} hideStyles={!includeStyles} />
            </div>
          </div>
        </aside>

        {/* Mobile filter modal */}
        {shouldRenderFilters && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ease-out starting:opacity-0 ${showFilters ? 'opacity-100' : 'opacity-0'}`}
              onClick={() => setShowFilters(false)}
            />
            <div
              className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 max-h-[85vh] overflow-y-auto transition-transform duration-200 ease-out starting:translate-y-full ${showFilters ? 'translate-y-0' : 'translate-y-full'}`}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-neutral-900 text-[17px]">Filtros</h3>
                <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-neutral-100 rounded-md transition-colors active:scale-90">
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>
              <FilterPanel filters={filters} onChange={handleFiltersChange} danceStyles={danceStyles} levels={levels} hideStyles={!includeStyles} />
              <button onClick={() => setShowFilters(false)} className="btn-dark w-full mt-5">
                Ver {results.length} resultado{results.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        <main className={`flex-1 min-w-0 transition-opacity duration-150 ${isPending ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between mb-6">
            <p className="text-[15px] text-neutral-500 flex items-center gap-2">
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
              <p className="text-neutral-500 text-[15px] max-w-sm mx-auto">{emptyText}</p>
              <button onClick={handleClearAll} className="btn-outline mt-6">
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {results.map(cls => <ClassCard key={cls.id} cls={cls} listName={listName} />)}
            </div>
          )}
        </main>
      </div>

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
