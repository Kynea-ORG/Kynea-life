'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, SlidersHorizontal, Map, List, X } from 'lucide-react';
import Header from '@/components/Header';
import ClassCard from '@/components/ClassCard';
import FilterPanel, { Filters } from '@/components/FilterPanel';
import { mockClasses } from '@/lib/mockData';

const defaultFilters: Filters = {
  city: '', district: '', styles: [], level: '', days: [],
  timeOfDay: '', modality: '', priceRange: '', type: '', withSpots: false,
};

function ClasesContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [filters, setFilters] = useState<Filters>({
    ...defaultFilters,
    styles: searchParams.get('style') ? [searchParams.get('style')!] : [],
    city: searchParams.get('city') || '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('Recomendados');

  const results = mockClasses.filter(cls => {
    if (cls.status !== 'published') return false;
    if (query && !cls.title.toLowerCase().includes(query.toLowerCase()) &&
        !cls.style.toLowerCase().includes(query.toLowerCase()) &&
        !cls.teacher.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (filters.styles.length && !filters.styles.includes(cls.style)) return false;
    if (filters.level && cls.level !== filters.level) return false;
    if (filters.modality && cls.modality !== filters.modality) return false;
    if (filters.withSpots && (cls.availableSpots === 0)) return false;
    if (filters.type && cls.type !== filters.type.toLowerCase()) return false;
    if (filters.days.length) {
      const classdays = cls.timeSlots.flatMap(s => s.days);
      if (!filters.days.some(d => classdays.includes(d))) return false;
    }
    return true;
  });

  const activeCount = filters.styles.length + filters.days.length +
    [filters.level, filters.modality, filters.priceRange, filters.type, filters.timeOfDay].filter(Boolean).length +
    (filters.withSpots ? 1 : 0);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Search bar */}
      <div className="bg-white border-b border-neutral-200 sticky top-[64px] z-40">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2.5 bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 focus-within:border-neutral-900 focus-within:ring-2 focus-within:ring-neutral-900/8 transition-all">
            <Search className="w-4 h-4 text-neutral-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Busca por estilo, profesor o academia…"
              className="flex-1 text-[15px] text-neutral-800 placeholder:text-neutral-400 bg-transparent outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile filter button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 text-[15px] font-semibold px-4 py-2.5 rounded-btn border-2 transition-all md:hidden ${
              activeCount > 0
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white border-neutral-300 text-neutral-700 hover:border-neutral-900'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros {activeCount > 0 && `(${activeCount})`}
          </button>

          <Link href="/mapa" className="hidden md:flex items-center gap-2 text-[15px] font-medium px-4 py-2.5 rounded-btn border-2 border-neutral-200 text-neutral-600 hover:border-neutral-900 transition-all">
            <Map className="w-4 h-4" /> Mapa
          </Link>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="hidden md:block text-[15px] text-neutral-600 border-2 border-neutral-200 rounded-btn px-4 py-2.5 outline-none bg-white cursor-pointer hover:border-neutral-900 transition-all"
          >
            {['Recomendados', 'Menor precio', 'Próximamente', 'Mejor disponibilidad'].map(o => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>

        {/* Active filter chips */}
        {(filters.styles.length > 0 || filters.level || filters.modality) && (
          <div className="max-w-[1200px] mx-auto px-6 pb-3 flex gap-2 overflow-x-auto">
            {filters.styles.map(s => (
              <span key={s} className="flex items-center gap-1 text-[13px] bg-neutral-900 text-white font-medium px-3 py-1 rounded-full whitespace-nowrap">
                {s}
                <button onClick={() => setFilters(f => ({ ...f, styles: f.styles.filter(x => x !== s) }))}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {filters.level && (
              <span className="flex items-center gap-1 text-[13px] bg-neutral-900 text-white font-medium px-3 py-1 rounded-full">
                {filters.level}
                <button onClick={() => setFilters(f => ({ ...f, level: '' }))}><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar */}
        <aside className="hidden md:block w-60 shrink-0">
          <div className="sticky top-36">
            <h3 className="font-bold text-neutral-900 text-[15px] mb-4">Filtros</h3>
            <FilterPanel filters={filters} onChange={setFilters} />
          </div>
        </aside>

        {/* Mobile filter modal */}
        {showFilters && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowFilters(false)} />
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-neutral-900 text-[17px]">Filtros</h3>
                <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-neutral-100 rounded-md">
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>
              <FilterPanel filters={filters} onChange={setFilters} />
              <button
                onClick={() => setShowFilters(false)}
                className="btn-dark w-full mt-5"
              >
                Ver {results.length} resultado{results.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <p className="text-[15px] text-neutral-500">
              <span className="font-bold text-neutral-900">{results.length}</span> clase{results.length !== 1 ? 's' : ''} disponible{results.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <button className="p-2 rounded-md bg-neutral-900 text-white"><List className="w-4 h-4" /></button>
              <Link href="/mapa" className="p-2 rounded-md hover:bg-neutral-100 text-neutral-400"><Map className="w-4 h-4" /></Link>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-5xl mb-5">🕺</p>
              <h3 className="text-[24px] font-bold text-neutral-900 mb-2">Sin resultados</h3>
              <p className="text-neutral-500 text-[15px] max-w-sm mx-auto">No encontramos clases con esos filtros. Prueba cambiando el estilo, ciudad o nivel.</p>
              <button
                onClick={() => { setFilters(defaultFilters); setQuery(''); }}
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

export default function ClasesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-neutral-400 text-[15px]">Cargando…</div>}>
      <ClasesContent />
    </Suspense>
  );
}
