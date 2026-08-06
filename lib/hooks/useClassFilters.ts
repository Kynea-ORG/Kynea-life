'use client';
import { useState, useRef, useCallback, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EMPTY_FILTERS, type Filters } from '@/components/FilterPanel';
import type { DanceClass } from '@/lib/types';

function matchesPriceMax(cls: DanceClass, priceMax: number): boolean {
  const free = cls.priceType === 'Gratis' || cls.price === 0;
  if (free) return true;
  const p = cls.offerPrice ?? cls.price;
  return p <= priceMax;
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

function buildSearchParams(query: string, filters: Filters, includeStyles: boolean): URLSearchParams {
  const p = new URLSearchParams();
  if (query) p.set('q', query);
  if (includeStyles) filters.styles.forEach(s => p.append('style', s));
  filters.levels.forEach(l => p.append('level', l));
  filters.modalities.forEach(m => p.append('modality', m));
  filters.types.forEach(t => p.append('type', t));
  filters.days.forEach(d => p.append('day', d));
  if (filters.city)      p.set('city', filters.city);
  if (filters.withSpots) p.set('spots', '1');
  return p;
}

function initFiltersFromUrl(sp: ReturnType<typeof useSearchParams>, includeStyles: boolean): Filters {
  return {
    ...EMPTY_FILTERS,
    styles:     includeStyles ? sp.getAll('style') : [],
    levels:     sp.getAll('level'),
    modalities: sp.getAll('modality'),
    types:      sp.getAll('type'),
    days:       sp.getAll('day'),
    city:       sp.get('city') || '',
    withSpots:  sp.get('spots') === '1',
    // priceMax and timesOfDay are client-only: not in URL
  };
}

interface UseClassFiltersOptions {
  initialClasses: DanceClass[];
  baseUrl: string;
  /** Whether the style dimension is selectable here (hidden on a category-locked page, whose classes are already server-filtered to one style). */
  includeStyles: boolean;
}

/**
 * Shared filter/URL-sync/client-filtering behavior behind both the general
 * /clases browser and the style-locked /categorias/[slug] browser — only
 * `includeStyles` and `baseUrl` differ between the two call sites.
 */
export function useClassFilters({ initialClasses, baseUrl, includeStyles }: UseClassFiltersOptions) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(sp.get('q') || '');
  const [filters, setFilters] = useState<Filters>(() => initFiltersFromUrl(sp, includeStyles));

  const queryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestFilters = useRef(filters);
  useEffect(() => {
    latestFilters.current = filters;
  }, [filters]);

  const pushUrl = useCallback((q: string, f: Filters) => {
    const params = buildSearchParams(q, f, includeStyles);
    const qs = params.toString();
    startTransition(() => {
      router.replace(`${baseUrl}${qs ? '?' + qs : ''}`, { scroll: false });
    });
  }, [router, baseUrl, includeStyles]);

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
    // Cancel any pending debounced pushUrl from a query edit — otherwise it
    // fires after this and overwrites the just-cleared URL with the stale query.
    if (queryTimerRef.current) clearTimeout(queryTimerRef.current);
    setFilters(EMPTY_FILTERS);
    setQuery('');
    startTransition(() => {
      router.replace(baseUrl, { scroll: false });
    });
  };

  // Server pre-filters by the dimensions it can resolve in a query
  // (styles/levels/days/city/modalities/types/withSpots/query). Client
  // applies priceMax + timesOfDay on top, plus the other dims again for
  // instant feedback while the server re-fetch is in progress.
  const results = initialClasses.filter(cls => {
    if (query) {
      const q = query.toLowerCase();
      const matchesQuery =
        cls.title.toLowerCase().includes(q) ||
        cls.style.toLowerCase().includes(q) ||
        cls.teacher.name.toLowerCase().includes(q) ||
        cls.city.toLowerCase().includes(q) ||
        cls.district.toLowerCase().includes(q);
      if (!matchesQuery) return false;
    }
    if (filters.styles.length && !filters.styles.includes(cls.style)) return false;
    if (filters.levels.length && !filters.levels.includes(cls.level)) return false;
    if (filters.modalities.length && !filters.modalities.includes(cls.modality)) return false;
    if (filters.types.length && !filters.types.includes(cls.type)) return false;
    if (filters.withSpots && ((cls.availableSpots ?? 0) === 0)) return false;
    if (filters.priceMax !== null && !matchesPriceMax(cls, filters.priceMax)) return false;
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
    filters.timesOfDay.length + filters.modalities.length + (filters.priceMax !== null ? 1 : 0) +
    filters.types.length + (filters.withSpots ? 1 : 0) + (filters.city ? 1 : 0) +
    (query ? 1 : 0);

  return { query, filters, isPending, results, activeCount, handleQueryChange, handleFiltersChange, handleClearAll };
}
