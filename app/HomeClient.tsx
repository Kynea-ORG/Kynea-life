'use client';
import Link from 'next/link';
import Image from 'next/image';
import SmartImage from '@/components/SmartImage';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Search, MapPin, ArrowRight, ArrowLeft, Star, CalendarCheck,
  MessageCircle, ChevronLeft, ChevronRight, Loader2, X,
} from 'lucide-react';
import Header from '@/components/Header';
import ClassCard from '@/components/ClassCard';
import { TopAnnouncementRibbon, BottomSignupRibbon } from '@/components/HomeRibbons';
import { getTypeLabel, formatExperience } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { trackAuthCtaClick } from '@/lib/analytics';
import { useDelayedUnmount } from '@/lib/hooks/useDelayedUnmount';
import { STYLE_IMAGES, FALLBACK_CATEGORY_IMAGES, CATEGORY_GRADIENTS } from '@/lib/catalog/styleImages';
import type { DanceClass, DanceStyle, Teacher, DbDanceStyle } from '@/lib/types';
import type { HomeStats } from '@/lib/stats/queries';

export type SearchClass   = { id: string; slug: string; title: string; type: string; class_styles: { is_main: boolean; dance_styles: { name: string; slug: string } | null }[] | null };
export type SearchProfile = { id: string; slug: string; name: string; role: string; photo_url: string | null };

export function getMainStyle(cls: SearchClass) {
  const styleRow = cls.class_styles?.find(s => s.is_main) ?? cls.class_styles?.[0];
  return styleRow?.dance_styles ?? null;
}

// Estilo compartido por los dos campos-botón del buscador mobile (F1).
const MOBILE_SEARCH_TRIGGER_CLASS = 'w-full flex items-center gap-3 border border-neutral-200 rounded-2xl px-4 py-3 text-left cursor-pointer transition-[background-color,border-color,transform] duration-150 hover:border-neutral-300 active:scale-[0.98] active:bg-primary-bg active:border-primary/30';

const AVATAR_PALETTE = [
  { bg: 'bg-primary-bg',     text: 'text-primary' },
  { bg: 'bg-blue-pastel-bg', text: 'text-blue-pastel-dark' },
  { bg: 'bg-green-bg',       text: 'text-green-dark' },
  { bg: 'bg-yellow-bg',      text: 'text-yellow-dark' },
];

// Which styles show in the Home category strip, and in what order — purely
// a display choice for this page, independent of dance_styles.ord (which
// still governs the Crear Clase dropdown, filters, etc. elsewhere). Swap
// entries here instead of touching the catalog's real ordering.
const HOME_CATEGORY_SLUGS = [
  'salsa', 'bachata', 'heels', 'reggaeton', 'hip-hop',
  'urbano', 'contemporaneo', 'ballet', 'jazz-funk',
];

const HOW_IT_WORKS = [
  { step: '1', Icon: Search,       title: 'Busca tu estilo',   desc: 'Filtra por ciudad, día, nivel y estilo de baile.' },
  { step: '2', Icon: CalendarCheck, title: 'Elige tu clase',   desc: 'Revisa el perfil del profesor, horarios y precio.' },
  { step: '3', Icon: MessageCircle, title: 'Contacta directo', desc: 'Escríbele por WhatsApp y reserva tu cupo.' },
];

// ── Props ─────────────────────────────────────────────────────────────────
interface FeaturedCategory {
  style:   DanceStyle;
  classes: DanceClass[];
}

interface Props {
  initialClasses:     DanceClass[];
  featuredCategories: FeaturedCategory[];
  initialTeachers:    Teacher[];
  initialAcademias:   Teacher[];
  danceStyles:        DbDanceStyle[];
  stats:              HomeStats;
  userRole:           'alumno' | 'profesor' | 'academia' | null;
}

// ── Featured category row (e.g. Heels, Contemporáneo) ────────────────────
// Each row owns its own scroll ref, so this can't be inlined in a .map() —
// hooks can't be called a variable number of times in a loop body.
// Exported for unit testing.
export function FeaturedCategoryRow({ style, classes }: FeaturedCategory) {
  const scrollRef = useRef<HTMLDivElement>(null);
  if (classes.length === 0) return null;

  return (
    <section className="bg-white py-16 border-t border-neutral-100">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex items-end justify-between gap-6 mb-7 flex-wrap">
          <div>
            <h2 className="text-[27px] font-extrabold text-neutral-900 tracking-tight">{style}</h2>
            <p className="text-neutral-600 text-[15px] mt-1">Las clases de {style} más populares</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/clases?style=${encodeURIComponent(style)}`} className="text-[15px] font-semibold text-primary hover:text-primary-dark transition-colors whitespace-nowrap">
              Ver todas →
            </Link>
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => scrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
                className="w-10 h-10 rounded-full border border-neutral-200 bg-white flex items-center justify-center hover:bg-primary-bg hover:border-primary transition-colors duration-150 ease-out active:scale-90"
                aria-label="Anterior"
              >
                <ChevronLeft className="w-4.5 h-4.5 text-neutral-700" />
              </button>
              <button
                onClick={() => scrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                className="w-10 h-10 rounded-full border border-neutral-200 bg-white flex items-center justify-center hover:bg-primary-bg hover:border-primary transition-colors duration-150 ease-out active:scale-90"
                aria-label="Siguiente"
              >
                <ChevronRight className="w-4.5 h-4.5 text-neutral-700" />
              </button>
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-3 pt-1"
          style={{ scrollbarWidth: 'none', scrollSnapType: 'x mandatory', msOverflowStyle: 'none' } as React.CSSProperties}
        >
          {classes.map(cls => (
            <div key={cls.id} className="shrink-0 w-72 sm:w-80" style={{ scrollSnapAlign: 'start' }}>
              <ClassCard cls={cls} compact listName={`home_featured_${style}`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function HomeClient({ initialClasses, featuredCategories, initialTeachers, initialAcademias = [], danceStyles, stats, userRole }: Props) {
  const router = useRouter();
  const [query, setQuery]         = useState('');

  // Home category strip: fixed display order (HOME_CATEGORY_SLUGS), not the
  // catalog's own ord — falls back to the first 9 by ord if a slug isn't
  // found (e.g. not seeded yet in this environment).
  const homeCategories = HOME_CATEGORY_SLUGS
    .map(slug => danceStyles.find(s => s.slug === slug))
    .filter((s): s is DbDanceStyle => !!s);
  const displayedCategories = homeCategories.length > 0 ? homeCategories : danceStyles.slice(0, 9);

  // ── Search autocomplete ──
  const [suggestions, setSuggestions]       = useState<{ classes: SearchClass[]; profiles: SearchProfile[] }>({ classes: [], profiles: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching]       = useState(false);
  const [activeOptionIndex, setActiveOptionIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);

  const activeSuggestions = query.trim().length >= 2 ? suggestions : { classes: [] as SearchClass[], profiles: [] as SearchProfile[] };

  // ── Ciudad (segundo campo del buscador) — filtro cliente sobre
  // stats.cityNames (ya viene de fetchHomeStats), sin query nueva.
  const [city, setCity] = useState('');
  const [cityOpen, setCityOpen] = useState(false);
  const [activeCityIndex, setActiveCityIndex] = useState(-1);
  const cityRef = useRef<HTMLDivElement>(null);
  const filteredCities = stats.cityNames
    .filter(c => c.toLowerCase().includes(city.trim().toLowerCase()))
    .slice(0, 8);

  // Estilos que matchean el texto tipeado — alimenta la sección "Estilos"
  // del overlay mobile de búsqueda (filtro cliente, sin query nueva).
  const matchingStyles = danceStyles
    .filter(s => s.name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 4);

  // Overlay de búsqueda a pantalla completa en mobile (patrón VRBO: tocar
  // un campo abre pantalla completa en vez de un dropdown chico). Un
  // useDelayedUnmount por overlay (mismo patrón que ya usa Header.tsx) en
  // vez de una sola bandera + ref "recordando" cuál estaba abierto.
  const [mobileSearch, setMobileSearch] = useState<null | 'style' | 'city'>(null);
  const shouldRenderStyleSearch = useDelayedUnmount(mobileSearch === 'style', 200);
  const shouldRenderCitySearch = useDelayedUnmount(mobileSearch === 'city', 200);

  // Bloqueo de scroll en body mientras el overlay mobile esté abierto
  useEffect(() => {
    if (mobileSearch) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [mobileSearch]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;

    let active = true;
    const safeQ = q.replace(/[,()%_\\]/g, ' ').replace(/\s+/g, ' ').trim();
    if (safeQ.length < 2) return;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const supabase = createClient();
        const [{ data: classes }, { data: profiles }] = await Promise.all([
          supabase
            .from('classes')
            .select('id, slug, title, type, class_styles(is_main, dance_styles(name, slug))')
            .eq('status', 'published')
            .or('end_date.is.null,end_date.gte.today')
            .ilike('title', `%${safeQ}%`)
            .limit(4),
          supabase
            .from('profiles')
            .select('id, slug, name, role, photo_url')
            .in('role', ['profesor', 'academia'])
            .ilike('name', `%${safeQ}%`)
            .limit(3),
        ]);
        if (active) {
          setSuggestions({
            classes: (classes as unknown as SearchClass[]) ?? [],
            profiles: profiles ?? [],
          });
          setShowSuggestions(true);
        }
      } catch {
        if (active) {
          setSuggestions({ classes: [], profiles: [] });
        }
      } finally {
        if (active) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setActiveOptionIndex(-1);
      }
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setCityOpen(false);
        setActiveCityIndex(-1);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // ── Teachers carousel ──
  const teachersScrollRef = useRef<HTMLDivElement>(null);

  // ── Carousel auto-scroll ──
  const carouselRef = useRef<HTMLDivElement>(null);
  const carouselPausedRef = useRef(false);
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const interval = setInterval(() => {
      if (carouselPausedRef.current) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: 320, behavior: 'smooth' });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const numClasses = activeSuggestions.classes.length;
  const numProfiles = activeSuggestions.profiles.length;
  const hasSuggestions = numClasses > 0 || numProfiles > 0;
  const totalSearchOptions = hasSuggestions ? numClasses + numProfiles + 1 : 0;

  const navigateSearch = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (city.trim()) params.set('city', city.trim());
    router.push(`/clases?${params.toString()}`);
    setShowSuggestions(false);
    setActiveOptionIndex(-1);
    setMobileSearch(null);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigateSearch();
  };

  const handleQueryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setShowSuggestions(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (totalSearchOptions > 0) {
        setActiveOptionIndex(prev => (prev + 1) % totalSearchOptions);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (totalSearchOptions > 0) {
        setActiveOptionIndex(prev => (prev <= 0 ? totalSearchOptions - 1 : prev - 1));
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveOptionIndex(-1);
    } else if (e.key === 'Enter') {
      if (showSuggestions && activeOptionIndex >= 0) {
        e.preventDefault();
        if (activeOptionIndex < numClasses) {
          goToClass(activeSuggestions.classes[activeOptionIndex]);
        } else if (activeOptionIndex < numClasses + numProfiles) {
          goToProfile(activeSuggestions.profiles[activeOptionIndex - numClasses]);
        } else {
          navigateSearch();
        }
      }
    }
  };

  const handleCityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!cityOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setCityOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredCities.length > 0) {
        setActiveCityIndex(prev => (prev + 1) % filteredCities.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredCities.length > 0) {
        setActiveCityIndex(prev => (prev <= 0 ? filteredCities.length - 1 : prev - 1));
      }
    } else if (e.key === 'Escape') {
      setCityOpen(false);
      setActiveCityIndex(-1);
    } else if (e.key === 'Enter') {
      if (cityOpen && activeCityIndex >= 0 && activeCityIndex < filteredCities.length) {
        e.preventDefault();
        pickCity(filteredCities[activeCityIndex]);
      }
    }
  };

  // Compartidos entre el dropdown desktop y el overlay mobile (G2): cierran
  // ambas UIs de búsqueda además de navegar.
  function goToClass(cls: SearchClass) {
    const mainStyle = getMainStyle(cls);
    const categorySlug = mainStyle?.slug || 'clase';
    router.push(`/${categorySlug}/${cls.type}/${cls.slug}`);
    setShowSuggestions(false);
    setActiveOptionIndex(-1);
    setMobileSearch(null);
  }
  function goToProfile(p: SearchProfile) {
    router.push(`/profesores/${p.slug}`);
    setShowSuggestions(false);
    setActiveOptionIndex(-1);
    setMobileSearch(null);
  }
  function pickStyle(name: string) {
    setQuery(name);
    setShowSuggestions(false);
    setActiveOptionIndex(-1);
    setMobileSearch(null);
  }
  function pickCity(name: string) {
    setCity(name);
    setCityOpen(false);
    setActiveCityIndex(-1);
    setMobileSearch(null);
  }

  return (
    <div className="min-h-screen bg-white">
      <TopAnnouncementRibbon />

      {/* ── HERO — desktop (A1) ── */}
      <div className="hidden md:block relative bg-[#1A1A19] min-h-[400px] z-20">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src="/Background.webp"
            alt="Bailarina en movimiento"
            fill
            priority
            sizes="1440px"
            className="object-cover"
            style={{ objectPosition: '50% 0%' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(13,13,13,.55) 0%, rgba(13,13,13,.35) 38%, rgba(13,13,13,.72) 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(100deg, rgba(138,17,188,.30) 0%, rgba(13,13,13,0) 55%)' }} />
        </div>

        <Header transparent homeNav />

        <div className="relative z-10 max-w-[1240px] mx-auto px-6 pt-[84px] text-center">
          <h1 className="font-black text-[52px] leading-[1.08] tracking-[-0.03em] text-white mb-4">
            Tu próxima clase de baile te está esperando.
          </h1>
          <p className="text-[17px] text-white/80 max-w-[700px] mx-auto mb-10 leading-relaxed">
            Salsa, heels, bachata y más con profesores verificados en toda Latinoamérica.
          </p>
        </div>

        <div className="relative z-20 max-w-[880px] mx-auto px-6">
          <form onSubmit={handleSearch} className="w-full bg-white rounded-3xl shadow-2xl p-2 flex items-stretch gap-1">
            <div
              className="flex-[1.6] relative flex items-center gap-3 px-5 py-2.5 rounded-2xl min-w-0"
              ref={searchRef}
              onFocusCapture={() => {
                setCityOpen(false);
                setActiveCityIndex(-1);
              }}
              onBlur={e => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setShowSuggestions(false);
                  setActiveOptionIndex(-1);
                }
              }}
            >
              <Search className="w-[19px] h-[19px] text-neutral-400 shrink-0" />
              <div className="text-left min-w-0 flex-1">
                <p className="font-bold text-[12px] text-neutral-900 leading-none">¿Qué quieres bailar?</p>
                <input
                  type="text"
                  placeholder="Busca clases, academias, profesores…"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setActiveOptionIndex(-1); }}
                  onFocus={() => {
                    setShowSuggestions(true);
                    setCityOpen(false);
                    setActiveCityIndex(-1);
                  }}
                  onKeyDown={handleQueryKeyDown}
                  role="combobox"
                  aria-expanded={showSuggestions && (hasSuggestions || isSearching || query.trim().length >= 2)}
                  aria-autocomplete="list"
                  aria-controls="query-autocomplete-list"
                  aria-activedescendant={activeOptionIndex >= 0 ? `query-option-${activeOptionIndex}` : undefined}
                  className="w-full mt-0.5 text-[14.5px] text-neutral-500 placeholder:text-neutral-500 outline-none bg-transparent truncate"
                />
              </div>
              {query.length > 0 && !isSearching && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => { setQuery(''); setActiveOptionIndex(-1); }}
                  aria-label="Limpiar búsqueda"
                  className="text-neutral-400 hover:text-neutral-600 p-1 rounded-full transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {isSearching && <Loader2 className="w-4 h-4 text-neutral-400 animate-spin shrink-0" />}

              {/* Autocomplete dropdown */}
              {showSuggestions && (isSearching || hasSuggestions || query.trim().length >= 2) && (
                <div
                  id="query-autocomplete-list"
                  role="listbox"
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-neutral-200 z-50 max-h-[420px] overflow-y-auto overflow-x-hidden origin-top transition-[opacity,transform] duration-150 ease-out starting:opacity-0 starting:scale-95"
                >

                  {isSearching && (
                    <div className="flex items-center gap-2 px-4 py-3 text-[13px] text-neutral-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando…
                    </div>
                  )}

                  {!isSearching && !hasSuggestions && matchingStyles.length === 0 && (
                    <p className="px-4 py-3 text-[13px] text-neutral-400">
                      Sin resultados para &ldquo;{query}&rdquo;
                    </p>
                  )}

                  {/* Styles */}
                  {matchingStyles.length > 0 && (
                    <div>
                      <div className="px-4 pt-3 pb-1">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Estilos</span>
                      </div>
                      {matchingStyles.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => pickStyle(s.name)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary-bg flex items-center justify-center shrink-0">
                            <Search className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-[14px] font-semibold text-neutral-900">{s.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Classes */}
                  {activeSuggestions.classes.length > 0 && (
                    <div>
                      <div className="px-4 pt-3 pb-1">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Clases</span>
                      </div>
                      {activeSuggestions.classes.map((cls, i) => {
                        const mainStyle = getMainStyle(cls);
                        const isActive = activeOptionIndex === i;
                        return (
                          <button
                            key={cls.id}
                            id={`query-option-${i}`}
                            role="option"
                            aria-selected={isActive}
                            type="button"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => goToClass(cls)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                              isActive ? 'bg-neutral-100' : 'hover:bg-neutral-50'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg bg-primary-bg flex items-center justify-center shrink-0 text-sm">
                              💃
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] font-semibold text-neutral-900 truncate">{cls.title}</p>
                              <p className="text-[11px] text-neutral-400">{mainStyle?.name ? `${mainStyle.name} · ` : ''}{getTypeLabel(cls.type)}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Profiles */}
                  {activeSuggestions.profiles.length > 0 && (
                    <div className={activeSuggestions.classes.length > 0 ? 'border-t border-neutral-100' : ''}>
                      <div className="px-4 pt-3 pb-1">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Profesores</span>
                      </div>
                      {activeSuggestions.profiles.map((p, pIdx) => {
                        const globalIdx = numClasses + pIdx;
                        const isActive = activeOptionIndex === globalIdx;
                        return (
                          <button
                            key={p.id}
                            id={`query-option-${globalIdx}`}
                            role="option"
                            aria-selected={isActive}
                            type="button"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => goToProfile(p)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                              isActive ? 'bg-neutral-100' : 'hover:bg-neutral-50'
                            }`}
                          >
                            {p.photo_url ? (
                              <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0">
                                <SmartImage src={p.photo_url} alt={p.name} fill sizes="32px" className="object-cover" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-[13px] font-bold text-neutral-600 shrink-0">
                                {p.name.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] font-semibold text-neutral-900 truncate">{p.name}</p>
                              <p className="text-[11px] text-neutral-400 capitalize">{p.role}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {hasSuggestions && (
                    <div className={`border-t border-neutral-100 px-4 py-2.5 ${activeOptionIndex === numClasses + numProfiles ? 'bg-neutral-100' : ''}`}>
                      <button
                        type="button"
                        id={`query-option-${numClasses + numProfiles}`}
                        role="option"
                        aria-selected={activeOptionIndex === numClasses + numProfiles}
                        onMouseDown={e => e.preventDefault()}
                        onClick={navigateSearch}
                        className="text-[13px] text-primary font-semibold hover:underline w-full text-left"
                      >
                        Ver todos los resultados de &ldquo;{query}&rdquo; →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="w-px bg-neutral-200 my-2" />

            <div
              className="flex-1 relative flex items-center gap-3 px-5 py-2.5 min-w-0"
              ref={cityRef}
              onFocusCapture={() => {
                setShowSuggestions(false);
                setActiveOptionIndex(-1);
              }}
              onBlur={e => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setCityOpen(false);
                  setActiveCityIndex(-1);
                }
              }}
            >
              <MapPin className="w-[19px] h-[19px] text-neutral-400 shrink-0" />
              <div className="text-left min-w-0 flex-1">
                <p className="font-bold text-[12px] text-neutral-900 leading-none">¿En qué ciudad?</p>
                <input
                  type="text"
                  placeholder="¿Dónde bailas?"
                  value={city}
                  onChange={e => { setCity(e.target.value); setActiveCityIndex(-1); }}
                  onFocus={() => {
                    setCityOpen(true);
                    setShowSuggestions(false);
                    setActiveOptionIndex(-1);
                  }}
                  onKeyDown={handleCityKeyDown}
                  role="combobox"
                  aria-expanded={cityOpen && filteredCities.length > 0}
                  aria-autocomplete="list"
                  aria-controls="city-autocomplete-list"
                  aria-activedescendant={activeCityIndex >= 0 ? `city-option-${activeCityIndex}` : undefined}
                  className="w-full mt-0.5 text-[14.5px] text-neutral-500 placeholder:text-neutral-500 outline-none bg-transparent truncate"
                />
              </div>

              {city.length > 0 && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => { setCity(''); setActiveCityIndex(-1); }}
                  aria-label="Limpiar ciudad"
                  className="text-neutral-400 hover:text-neutral-600 p-1 rounded-full transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {cityOpen && filteredCities.length > 0 && (
                <div
                  id="city-autocomplete-list"
                  role="listbox"
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-neutral-200 py-1.5 z-50 max-h-[280px] overflow-y-auto overflow-x-hidden origin-top transition-[opacity,transform] duration-150 ease-out starting:opacity-0 starting:scale-95"
                >
                  {filteredCities.map((c, idx) => {
                    const isActive = activeCityIndex === idx;
                    return (
                      <button
                        key={c}
                        id={`city-option-${idx}`}
                        role="option"
                        aria-selected={isActive}
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => pickCity(c)}
                        className={`w-full text-left px-4 py-2.5 text-[13.5px] transition-colors ${
                          isActive ? 'bg-neutral-100 font-bold text-neutral-900' : 'text-neutral-700 hover:bg-neutral-50'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              onFocus={() => {
                setCityOpen(false);
                setShowSuggestions(false);
                setActiveCityIndex(-1);
                setActiveOptionIndex(-1);
              }}
              className="shrink-0 flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-black text-[15px] px-8 rounded-[18px] cursor-pointer transition-colors active:scale-[0.98]"
            >
              <Search className="w-4 h-4" /> Buscar
            </button>
          </form>
        </div>

        <div className="relative z-10 max-w-[880px] mx-auto px-6 text-center mt-[22px] pb-9">
          <Link href="/clases" className="inline-flex items-center gap-2 font-bold text-[14.5px] text-white underline underline-offset-4 hover:text-white/80 transition-colors">
            Explorar todas las clases
            <ArrowRight className="w-[15px] h-[15px]" />
          </Link>
        </div>
      </div>

      {/* ── HERO — mobile (F1) ── */}
      <div className="md:hidden bg-white">
        <Header transparent homeNav />

        <div className="relative overflow-hidden pb-7">
          <Image
            src="/Background-Mobile.webp"
            alt="Bailarina en movimiento"
            fill
            priority
            sizes="100vw"
            className="absolute inset-0 object-cover"
            style={{ objectPosition: '55% 25%' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(13,13,13,.5) 0%, rgba(13,13,13,.15) 45%, rgba(13,13,13,0) 100%)' }} />

          <div className="relative z-10 px-6 pt-10">
            <h1 className="font-black text-[30px] leading-[1.1] tracking-[-0.03em] text-white">
              Tu próxima clase<br />de baile te está<br />esperando.
            </h1>
          </div>

          <div className="relative z-10 mx-5 mt-7 bg-white rounded-3xl shadow-xl p-5 flex flex-col gap-2.5">
            <button type="button" onClick={() => setMobileSearch('style')}
              className={MOBILE_SEARCH_TRIGGER_CLASS}>
              <Search className="w-[19px] h-[19px] text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] text-neutral-400">¿Qué quieres bailar?</p>
                <p className="text-[15px] text-neutral-900 mt-0.5 truncate">
                  {query || 'Busca clases, academias, profesores…'}
                </p>
              </div>
            </button>

            <button type="button" onClick={() => setMobileSearch('city')}
              className={MOBILE_SEARCH_TRIGGER_CLASS}>
              <MapPin className="w-[19px] h-[19px] text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] text-neutral-400">¿En qué ciudad?</p>
                <p className="text-[15px] text-neutral-900 mt-0.5 truncate">
                  {city || '¿Dónde bailas?'}
                </p>
              </div>
            </button>

            <button type="button" onClick={navigateSearch}
              className="w-full font-black text-[15.5px] text-white bg-primary hover:bg-primary-dark active:bg-primary-dark rounded-full py-3.5 mt-1.5 shadow-[0_6px_16px_rgba(138,17,188,.35)] cursor-pointer transition-[background-color,transform,box-shadow] duration-150 active:scale-[0.97] active:shadow-[0_2px_6px_rgba(138,17,188,.3)]">
              Buscar
            </button>

            <Link href="/clases" className="block text-center font-bold text-[13.5px] text-primary mt-1 py-1 active:opacity-60 transition-opacity">
              Explorar clases
            </Link>
          </div>
        </div>
      </div>

      {/* ── Overlay mobile: buscador de estilo (G2) ── */}
      {shouldRenderStyleSearch && (
        <div className={`md:hidden fixed inset-0 z-[60] bg-white flex flex-col transition-transform duration-200 ease-out starting:translate-y-full ${mobileSearch === 'style' ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-100 shrink-0">
            <button type="button" onClick={() => setMobileSearch(null)} aria-label="Volver">
              <ArrowLeft className="w-5 h-5 text-neutral-900" />
            </button>
            <div className="flex-1 flex items-center gap-2.5 bg-neutral-50 border-2 border-primary rounded-xl px-3.5 py-2.5">
              <Search className="w-[17px] h-[17px] text-primary shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Busca clases, academias, profesores…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 min-w-0 text-[15px] text-neutral-900 outline-none bg-transparent"
              />
              {query.length > 0 && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Limpiar búsqueda"
                  className="text-neutral-400 hover:text-neutral-600 p-1 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-8">
            {matchingStyles.length > 0 && (
              <div className="pt-4">
                <p className="px-5 pb-1.5 text-[11px] font-extrabold tracking-widest uppercase text-neutral-400">Estilos</p>
                {matchingStyles.map(s => (
                  <button key={s.id} type="button" onClick={() => pickStyle(s.name)}
                    className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-neutral-50 transition-colors text-left">
                    <div className="w-[34px] h-[34px] rounded-[10px] bg-primary-bg flex items-center justify-center shrink-0">
                      <Search className="w-[17px] h-[17px] text-primary" />
                    </div>
                    <span className="text-[14.5px] text-neutral-900">{s.name}</span>
                  </button>
                ))}
              </div>
            )}

            {isSearching && (
              <div className="flex items-center gap-2 px-5 py-4 text-[13px] text-neutral-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando…
              </div>
            )}

            {!isSearching && activeSuggestions.classes.length === 0 && activeSuggestions.profiles.length === 0 && matchingStyles.length === 0 && query.trim().length >= 2 && (
              <p className="px-5 py-4 text-[13px] text-neutral-400">Sin resultados para &ldquo;{query}&rdquo;</p>
            )}

            {activeSuggestions.classes.length > 0 && (
              <div className="pt-4">
                <p className="px-5 pb-1.5 text-[11px] font-extrabold tracking-widest uppercase text-neutral-400">Clases</p>
                {activeSuggestions.classes.map(cls => {
                  const mainStyle = getMainStyle(cls);
                  return (
                    <button key={cls.id} type="button" onClick={() => goToClass(cls)}
                      className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-neutral-50 transition-colors text-left">
                      <div className="w-[34px] h-[34px] rounded-[10px] bg-primary-bg flex items-center justify-center shrink-0 text-sm">💃</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14.5px] font-semibold text-neutral-900 truncate">{cls.title}</p>
                        <p className="text-[11.5px] text-neutral-400">{mainStyle?.name ? `${mainStyle.name} · ` : ''}{getTypeLabel(cls.type)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {activeSuggestions.profiles.length > 0 && (
              <div className="pt-4">
                <p className="px-5 pb-1.5 text-[11px] font-extrabold tracking-widest uppercase text-neutral-400">Profesores</p>
                {activeSuggestions.profiles.map(p => (
                  <button key={p.id} type="button" onClick={() => goToProfile(p)}
                    className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-neutral-50 transition-colors text-left">
                    {p.photo_url ? (
                      <div className="relative w-[34px] h-[34px] rounded-full overflow-hidden shrink-0">
                        <SmartImage src={p.photo_url} alt={p.name} fill sizes="34px" className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-[34px] h-[34px] rounded-full bg-neutral-200 flex items-center justify-center text-[13px] font-bold text-neutral-600 shrink-0">
                        {p.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px] font-semibold text-neutral-900 truncate">{p.name}</p>
                      <p className="text-[11.5px] text-neutral-400 capitalize">{p.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {hasSuggestions && (
              <div className="px-5 pt-4">
                <button type="button" onClick={navigateSearch} className="text-[13.5px] font-bold text-primary">
                  Ver todos los resultados para &ldquo;{query}&rdquo; →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Overlay mobile: buscador de ciudad (G3) ── */}
      {shouldRenderCitySearch && (
        <div className={`md:hidden fixed inset-0 z-[60] bg-white flex flex-col transition-transform duration-200 ease-out starting:translate-y-full ${mobileSearch === 'city' ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-100 shrink-0">
            <button type="button" onClick={() => setMobileSearch(null)} aria-label="Volver">
              <ArrowLeft className="w-5 h-5 text-neutral-900" />
            </button>
            <div className="flex-1 flex items-center gap-2.5 bg-neutral-50 border-2 border-primary rounded-xl px-3.5 py-2.5">
              <MapPin className="w-[17px] h-[17px] text-primary shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Busca tu ciudad…"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="flex-1 min-w-0 text-[15px] text-neutral-900 outline-none bg-transparent"
              />
              {city.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCity('')}
                  aria-label="Limpiar ciudad"
                  className="text-neutral-400 hover:text-neutral-600 p-1 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-8">
            <p className="px-5 pt-5 pb-1.5 text-[11px] font-extrabold tracking-widest uppercase text-neutral-400">
              {city.trim() ? 'Ciudades' : 'Ciudades populares'}
            </p>
            {filteredCities.length === 0 && (
              <p className="px-5 py-3 text-[13px] text-neutral-400">Sin resultados para &ldquo;{city}&rdquo;</p>
            )}
            {filteredCities.map(c => (
              <button key={c} type="button" onClick={() => pickCity(c)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 transition-colors text-left">
                <MapPin className="w-[17px] h-[17px] text-neutral-400 shrink-0" />
                <span className="text-[14.5px] font-semibold text-neutral-900">{c}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── CATEGORÍAS ── */}
      <section className="bg-white py-8">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-[22px] font-extrabold text-neutral-900 tracking-tight">Categorías</h2>
            <Link href="/categorias" className="flex items-center gap-1 text-[15px] text-primary font-semibold hover:text-primary-dark transition-colors whitespace-nowrap">
              Ver todas <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div
            className="flex gap-3 overflow-x-auto pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
          >
            {displayedCategories.map((style, i) => (
              <Link
                key={style.id}
                href={`/clases?style=${encodeURIComponent(style.name)}`}
                className="relative shrink-0 w-[168px] h-[152px] rounded-2xl border border-neutral-900 cursor-pointer group select-none block overflow-hidden"
              >
                {/* Background: curated photo per style, falls back to a generic one if not uploaded yet */}
                <div className="absolute inset-0 scale-100 group-hover:scale-110 transition-transform duration-200 ease-out">
                  <div
                    className="absolute inset-0 -z-10"
                    style={{ background: CATEGORY_GRADIENTS[i % CATEGORY_GRADIENTS.length] }}
                  />
                  <Image
                    src={STYLE_IMAGES[style.slug] ?? FALLBACK_CATEGORY_IMAGES[i % FALLBACK_CATEGORY_IMAGES.length]}
                    alt=""
                    aria-hidden="true"
                    fill
                    sizes="168px"
                    className="object-cover"
                  />
                </div>

                {/* Legibility + hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-primary/10 to-black/0 transition-opacity duration-200 group-hover:from-primary-dark/70" />

                {/* Content: name bottom-left */}
                <div className="relative z-10 p-4 h-full flex flex-col justify-end">
                  <p className="text-[17px] font-black text-white tracking-tight leading-none drop-shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5">
                    {style.name}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLASES ESTA SEMANA ── */}
      <section className="bg-neutral-50 py-16">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-[30px] font-extrabold text-neutral-900 tracking-snug">Clases de baile para ti</h2>
              <p className="text-neutral-600 text-[15px] mt-1">Seleccionadas para ti</p>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <Link href="/clases" className="flex items-center gap-1 text-[15px] text-primary font-semibold hover:text-primary-dark transition-colors">
                Ver todas <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {initialClasses.length === 0 ? (
            <div className="text-center py-16 text-neutral-400">
              <p className="text-[15px]">No hay clases disponibles en este momento.</p>
              <p className="text-[13px] mt-1">¡Pronto habrá más!</p>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => carouselRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
                className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-neutral-200 rounded-full shadow-sm items-center justify-center hover:bg-neutral-50 transition-colors duration-150 ease-out active:scale-90 hidden sm:flex"
                aria-label="Anterior"
              >
                <ChevronLeft className="w-5 h-5 text-neutral-600" />
              </button>

              <div
                ref={carouselRef}
                className="flex gap-4 overflow-x-auto pb-4"
                style={{ scrollbarWidth: 'none', scrollSnapType: 'x mandatory', msOverflowStyle: 'none' } as React.CSSProperties}
                onMouseEnter={() => { carouselPausedRef.current = true; }}
                onMouseLeave={() => { carouselPausedRef.current = false; }}
              >
                {initialClasses.map(cls => (
                  <div key={cls.id} className="shrink-0 w-72 sm:w-80" style={{ scrollSnapAlign: 'start' }}>
                    <ClassCard cls={cls} compact listName="home_recommended" />
                  </div>
                ))}
              </div>

              <button
                onClick={() => carouselRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-neutral-200 rounded-full shadow-sm items-center justify-center hover:bg-neutral-50 transition-colors duration-150 ease-out active:scale-90 hidden sm:flex"
                aria-label="Siguiente"
              >
                <ChevronRight className="w-5 h-5 text-neutral-600" />
              </button>
            </div>
          )}

          <div className="mt-6 text-center sm:hidden">
            <Link href="/clases" className="btn-outline">Ver todas las clases</Link>
          </div>
        </div>
      </section>

      {/* ── CATEGORÍAS DESTACADAS (Heels, Contemporáneo, …) ── */}
      {featuredCategories.map((cat, i) => (
        <FeaturedCategoryRow key={`${cat.style}-${i}`} style={cat.style} classes={cat.classes} />
      ))}

      {/* ── ACADEMIAS ── */}
      {/* Antes de Profesores/Cómo funciona, con fondo negro — el amarillo
          quedaba muy fuerte; neutral-900 es más elegante y además ya es el
          color que usa el banner de portada del perfil público de academia
          (ProfesorDetailClient), así que refuerza la misma identidad visual
          en vez de introducir un tercer tratamiento distinto. */}
      {initialAcademias.length > 0 && (
        <section className="bg-neutral-900 py-16">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-[30px] font-extrabold text-white tracking-snug">Academias</h2>
                <p className="text-white/60 text-[15px] mt-1">Espacios de danza en toda Latinoamérica</p>
              </div>
              <Link href="/profesores?type=academia" className="hidden sm:flex items-center gap-1 text-[15px] text-white font-semibold hover:text-white/70 transition-colors">
                Ver todas <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {initialAcademias.map(t => (
                <Link
                  key={t.id}
                  href={`/profesores/${t.slug}`}
                  className="card-hover flex items-start gap-4 group"
                >
                  <div className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-neutral-200 transition-transform duration-300 group-hover:scale-105">
                    {t.photo ? (
                      <SmartImage
                        src={t.photo}
                        alt={t.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                        style={{ objectPosition: t.photoPosition || '50% 50%', transform: `scale(${t.photoZoom || 1})` }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl font-black text-neutral-400 select-none">
                          {t.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-bold text-neutral-900 text-[16px] leading-tight">{t.name}</h3>
                      {t.rating && (
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                          <span className="text-[13px] font-bold text-neutral-800">{t.rating}</span>
                        </div>
                      )}
                    </div>
                    {t.nationality && (
                      <p className="text-[13px] text-neutral-600 mb-2">
                        <MapPin className="w-3 h-3 inline mr-0.5 -mt-px" />
                        {t.nationality}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {t.styles.slice(0, 3).map(s => (
                        <span key={s} className="badge-pink text-[11px]">{s}</span>
                      ))}
                      {t.styles.length > 3 && (
                        <span className="text-[11px] text-neutral-400 px-1">+{t.styles.length - 3}</span>
                      )}
                    </div>
                    {t.totalClasses && (
                      <p className="text-[12px] text-neutral-400">{t.totalClasses} clases publicadas</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── PROFESORES DESTACADOS ── */}
      {initialTeachers.length > 0 && (
        <section className="bg-white py-16">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="flex items-end justify-between gap-6 mb-7 flex-wrap">
              <div>
                <h2 className="text-[27px] font-extrabold text-neutral-900 tracking-tight">Profesores destacados</h2>
                <p className="text-neutral-600 text-[15px] mt-1">Los mejores instructores de Latinoamérica</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/profesores" className="text-[15px] font-semibold text-primary hover:text-primary-dark transition-colors whitespace-nowrap">
                  Ver todos →
                </Link>
                <div className="hidden sm:flex items-center gap-2">
                  <button
                    onClick={() => teachersScrollRef.current?.scrollBy({ left: -460, behavior: 'smooth' })}
                    className="w-10 h-10 rounded-full border border-neutral-200 bg-white flex items-center justify-center hover:bg-primary-bg hover:border-primary transition-colors duration-150 ease-out active:scale-90"
                    aria-label="Anterior"
                  >
                    <ChevronLeft className="w-4.5 h-4.5 text-neutral-700" />
                  </button>
                  <button
                    onClick={() => teachersScrollRef.current?.scrollBy({ left: 460, behavior: 'smooth' })}
                    className="w-10 h-10 rounded-full border border-neutral-200 bg-white flex items-center justify-center hover:bg-primary-bg hover:border-primary transition-colors duration-150 ease-out active:scale-90"
                    aria-label="Siguiente"
                  >
                    <ChevronRight className="w-4.5 h-4.5 text-neutral-700" />
                  </button>
                </div>
              </div>
            </div>

            <div
              ref={teachersScrollRef}
              className="flex gap-5 overflow-x-auto pb-3 pt-1 -mx-1 px-1"
              style={{ scrollbarWidth: 'none', scrollSnapType: 'x mandatory', msOverflowStyle: 'none' } as React.CSSProperties}
            >
              {initialTeachers.map((t, i) => {
                const avatar = AVATAR_PALETTE[i % AVATAR_PALETTE.length];
                return (
                  <Link
                    key={t.id}
                    href={`/profesores/${t.slug}`}
                    className="shrink-0 w-[210px] rounded-2xl border border-neutral-200 bg-white overflow-hidden transition-[box-shadow,border-color,transform] duration-150 ease-out hover:border-neutral-300 hover:shadow-[0_12px_28px_rgba(17,17,17,0.08)] hover:-translate-y-0.5 active:scale-[0.98]"
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    <div className={`relative w-full aspect-square overflow-hidden flex items-center justify-center ${avatar.bg}`}>
                      {t.photo ? (
                        <SmartImage
                          src={t.photo}
                          alt={t.name}
                          fill
                          sizes="210px"
                          className="object-cover"
                          style={{ objectPosition: t.photoPosition || '50% 50%', transform: `scale(${t.photoZoom || 1})` }}
                        />
                      ) : (
                        <span className={`text-[56px] font-extrabold ${avatar.text} select-none`}>
                          {t.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      {t.experience > 0 && (
                        <span className="absolute top-2.5 left-2.5 bg-white/90 rounded-full px-2.5 py-1 text-[11px] font-semibold text-neutral-900 whitespace-nowrap">
                          {formatExperience(t.experience)}
                        </span>
                      )}
                    </div>
                    <div className="px-4 pt-3.5 pb-4">
                      <h3 className="font-bold text-neutral-900 text-[16px] leading-tight mb-0.5 truncate">{t.name}</h3>
                      {t.nationality && <p className="text-[12.5px] text-neutral-400 mb-2.5 truncate">{t.nationality}</p>}
                      <div className="flex flex-wrap gap-1.5 mb-3 min-h-[26px]">
                        {t.styles.slice(0, 2).map(s => (
                          <span key={s} className="badge-pink text-[11.5px] px-2.5 py-1">{s}</span>
                        ))}
                      </div>
                      <span className="text-[13.5px] font-semibold text-primary">Ver perfil →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── CÓMO FUNCIONA ── */}
      <section className="bg-white py-20">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-[30px] font-extrabold text-neutral-900 tracking-snug mb-2">¿Cómo funciona?</h2>
            <p className="text-neutral-600 text-[15px]">Encuentra tu clase en tres pasos simples</p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-0">
            {HOW_IT_WORKS.map((item) => {
              const { Icon } = item;
              return (
                <div key={item.step} className="flex sm:flex-col items-start sm:items-center sm:text-center flex-1 gap-5 sm:gap-0 sm:px-8">
                  <div className="relative shrink-0 mb-0 sm:mb-6">
                    <div className="w-16 h-16 bg-neutral-900 text-white rounded-full flex items-center justify-center">
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-400 rounded-full flex items-center justify-center text-[10px] font-black text-white">
                      {item.step}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 text-[17px] mb-1.5">{item.title}</h3>
                    <p className="text-[15px] text-neutral-600 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center mt-12">
            <Link href="/clases" className="btn-dark">Empezar a buscar →</Link>
          </div>
        </div>
      </section>

      {/* ── CTA PROFESORES ── */}
      {userRole !== 'profesor' && userRole !== 'academia' && (
        <section className="hero-section py-20">
          <div className="max-w-[880px] mx-auto px-6 text-center">
            <h2 className="text-[38px] font-black tracking-snug text-white mb-4">
              ¿Eres profesor o academia?
            </h2>
            <p className="text-[17px] text-white/80 mb-10 max-w-xl mx-auto leading-relaxed">
              Publica tus clases gratis y llega a cientos de alumnos en toda Latinoamérica. Sin comisiones.
            </p>
            <div className="flex justify-center">
              <Link href="/unete" onClick={() => trackAuthCtaClick({ action: 'registro', location: 'home_teacher_cta' })} className="btn-hero">Publicar mi primera clase →</Link>
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer className="border-t border-neutral-200 py-10">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Image src="/logo.png" alt="Kynea" width={90} height={30} />
            <p className="text-[13px] text-neutral-400">© 2026 Kynea. La primera plataforma integral de danza en Latinoamérica.</p>
            <div className="flex gap-6 text-[13px] text-neutral-400">
              {[
                { label: 'Términos', href: '/terminos' },
                { label: 'Privacidad', href: '/privacidad' },
                { label: 'Contacto', href: 'mailto:hola@kynea.pe' },
              ].map(l => (
                <Link key={l.label} href={l.href} className="hover:text-neutral-700 transition-colors">{l.label}</Link>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <BottomSignupRibbon />
    </div>
  );
}
