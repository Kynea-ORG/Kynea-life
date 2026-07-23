'use client';
import { useState, useTransition, useRef, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, SlidersHorizontal, Map, List, X, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import ClassCard from '@/components/ClassCard';
import FilterPanel, { Filters, EMPTY_FILTERS } from '@/components/FilterPanel';
import type { DanceClass } from '@/lib/types';
import { useDelayedUnmount } from '@/lib/hooks/useDelayedUnmount';

// ── Price and time helpers (these stay client-side: require computed logic) ───

function matchesPriceRange(cls: DanceClass, range: string): boolean {
  const free = cls.priceType === 'Gratis' || cls.price === 0;
  const p = cls.offerPrice ?? cls.price;
  switch (range) {
    case 'Gratis':      return free;
    case 'Hasta S/50':  return !free && p <= 50;
    case 'S/50–S/150':  return !free && p > 50 && p <= 150;
    case 'S/150+':      return !free && p > 150;
    default:            return false;
  }
}

function matchesTimeOfDay(cls: DanceClass, bucket: string): boolean {
  return cls.timeSlots.some(s => {
    const hour = parseInt(s.startTime.split(':')[0], 10);
    if (Number.isNaN(hour)) return false;
    if (bucket.startsWith('Mañana')) return hour >= 6 && hour < 12;
    if (bucket.startsWith('Tarde'))  return hour >= 12 && hour < 18;
    if (bucket.startsWith('Noche'))  return hour >= 18 && hour <= 23;
    return false;
  });
}

// ── URL serialization / deserialization ───────────────────────────────────────

function buildSearchParams(query: string, filters: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (query)               p.set('q', query);
  filters.styles.forEach(s => p.append('style', s));
  filters.levels.forEach(l => p.append('level', l));
  filters.modalities.forEach(m => p.append('modality', m));
  filters.types.forEach(t => p.append('type', t));
  filters.days.forEach(d => p.append('day', d));
  if (filters.city)        p.set('city', filters.city);
  if (filters.withSpots)   p.set('spots', '1');
  return p;
}

function initFiltersFromUrl(sp: ReturnType<typeof useSearchParams>): Filters {
  return {
    ...EMPTY_FILTERS,
    styles:     sp.getAll('style'),
    levels:     sp.getAll('level'),
    modalities: sp.getAll('modality'),
    types:      sp.getAll('type'),
    days:       sp.getAll('day'),
    city:       sp.get('city') || '',
    withSpots:  sp.get('spots') === '1',
    // priceRanges and timesOfDay are client-only: not in URL
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClasesContent({
  initialClasses,
  danceStyles = [],
  levels = [],
}: {
  initialClasses: DanceClass[];
  danceStyles?: string[];
  levels?: string[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(sp.get('q') || '');
  const [filters, setFilters] = useState<Filters>(() => initFiltersFromUrl(sp));
  const [showFilters, setShowFilters] = useState(false);
  const shouldRenderFilters = useDelayedUnmount(showFilters, 200);
  const [sortBy, setSortBy] = useState('Recomendados');

  // Debounce for query URL updates
  const queryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestFilters = useRef(filters);
  useEffect(() => {
    latestFilters.current = filters;
  }, [filters]);

  const pushUrl = useCallback((q: string, f: Filters) => {
    const params = buildSearchParams(q, f);
    const qs = params.toString();
    startTransition(() => {
      router.replace(`/clases${qs ? '?' + qs : ''}`, { scroll: false });
    });
  }, [router]);

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
    pushUrl(query, newFilters);
  };

  const handleQueryChange = (q: string) => {
    setQuery(q);
    if (queryTimerRef.current) clearTimeout(queryTimerRef.current);
    queryTimerRef.current = setTimeout(() => {
      pushUrl(q, latestFilters.current);
    }, 400);
  };

  const handleClearAll = () => {
    setFilters(EMPTY_FILTERS);
    setQuery('');
    startTransition(() => {
      router.replace('/clases', { scroll: false });
    });
  };

  // ── Client-side filtering (instant feedback + client-only dimensions) ─────────
  // The server pre-filters by styles/levels/days/city/modalities/types/withSpots/query.
  // Client applies priceRanges + timesOfDay on top, plus the other dims for
  // instant feedback while the server re-fetch is in progress.

  const results = initialClasses.filter(cls => {
    if (query && !cls.title.toLowerCase().includes(query.toLowerCase()) &&
        !cls.style.toLowerCase().includes(query.toLowerCase()) &&
        !cls.teacher.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (filters.styles.length && !filters.styles.includes(cls.style)) return false;
    if (filters.levels.length && !filters.levels.includes(cls.level)) return false;
    if (filters.modalities.length && !filters.modalities.includes(cls.modality)) return false;
    if (filters.types.length && !filters.types.includes(cls.type)) return false;
    if (filters.withSpots && ((cls.availableSpots ?? 0) === 0)) return false;
    if (filters.priceRanges.length && !filters.priceRanges.some(r => matchesPriceRange(cls, r))) return false;
    if (filters.timesOfDay.length && !filters.timesOfDay.some(t => matchesTimeOfDay(cls, t))) return false;
    if (filters.days.length) {
      const classdays = cls.timeSlots.flatMap(s => s.days);
      if (!filters.days.some(d => classdays.includes(d))) return false;
    }
    if (filters.city && cls.city !== filters.city) return false;
    return true;
  });

  const activeCount =
    filters.styles.length + filters.levels.length + filters.days.length +
    filters.timesOfDay.length + filters.modalities.length + filters.priceRanges.length +
    filters.types.length + (filters.withSpots ? 1 : 0) + (filters.city ? 1 : 0) +
    (query ? 1 : 0);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Search bar */}
      <div className="bg-white border-b border-neutral-200 sticky top-[64px] z-40">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2.5 bg-neutral-50 border border-neutral-200 rounded-md px-4 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-neutral-900/8 transition-[border-color,box-shadow]">
            <Search className="w-4 h-4 text-neutral-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              placeholder="Busca por estilo, profesor o academia…"
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
            className={`flex items-center gap-2 text-[15px] font-semibold px-4 py-2.5 rounded-btn border-2 border-neutral-900 transition-colors active:scale-[0.97] md:hidden ${
              activeCount > 0
                ? 'bg-neutral-900 text-white'
                : 'bg-white text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros {activeCount > 0 && `(${activeCount})`}
          </button>

          <Link href="/mapa" className="hidden md:flex items-center gap-2 text-[15px] font-medium px-4 py-2.5 rounded-btn border-2 border-neutral-900 text-neutral-700 hover:bg-neutral-50 transition-colors">
            <Map className="w-4 h-4" /> Mapa
          </Link>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="hidden md:block text-[15px] text-neutral-600 border-2 border-neutral-900 rounded-btn px-4 py-2.5 outline-none bg-white cursor-pointer hover:bg-neutral-50 transition-colors"
          >
            {['Recomendados', 'Menor precio', 'Próximamente', 'Mejor disponibilidad'].map(o => (
              <option key={o}>{o}</option>
            ))}
          </select>
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
          <div className="sticky top-36">
            <h3 className="font-bold text-neutral-900 text-[15px] mb-4">Filtros</h3>
            <FilterPanel filters={filters} onChange={handleFiltersChange} danceStyles={danceStyles} levels={levels} />
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
              <FilterPanel filters={filters} onChange={handleFiltersChange} danceStyles={danceStyles} levels={levels} />
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
                : <><span className="font-bold text-neutral-900">{results.length}</span> clase{results.length !== 1 ? 's' : ''} disponible{results.length !== 1 ? 's' : ''}</>
              }
            </p>
            <div className="flex gap-2">
              <button className="p-2 rounded-md bg-neutral-900 text-white"><List className="w-4 h-4" /></button>
              <Link href="/mapa" className="p-2 rounded-md hover:bg-neutral-100 text-neutral-400"><Map className="w-4 h-4" /></Link>
            </div>
          </div>

          {results.length === 0 && !isPending ? (
            <div className="text-center py-24 animate-fade-in">
              <p className="text-5xl mb-5 animate-pop">🕺</p>
              <h3 className="text-[24px] font-bold text-neutral-900 mb-2">Sin resultados</h3>
              <p className="text-neutral-500 text-[15px] max-w-sm mx-auto">No encontramos clases con esos filtros. Prueba cambiando el estilo, ciudad o nivel.</p>
              <button
                onClick={handleClearAll}
                className="btn-outline mt-6"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {results.map(cls => <ClassCard key={cls.id} cls={cls} />)}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
