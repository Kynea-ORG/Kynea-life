'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Search, MapPin, ArrowRight, Star, Check, CalendarCheck,
  MessageCircle, ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react';
import Header from '@/components/Header';
import ClassCard from '@/components/ClassCard';
import { getTypeLabel } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { DanceClass, DanceStyle, Teacher, DbDanceStyle } from '@/lib/types';
import type { HomeStats } from '@/lib/stats/queries';

// ── Types ─────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SearchClass   = { id: string; title: string; type: string; class_styles: any[] | null };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SearchProfile = { id: string; name: string; role: string; districts: any; photo_url: string | null };

const AVATAR_PALETTE = [
  { bg: 'bg-primary-bg',     text: 'text-primary' },
  { bg: 'bg-blue-pastel-bg', text: 'text-blue-pastel-dark' },
  { bg: 'bg-green-bg',       text: 'text-green-dark' },
  { bg: 'bg-yellow-bg',      text: 'text-yellow-dark' },
];

// One curated photo per dance style, keyed by slug — add an entry here as
// more get uploaded to public/categorias/. Styles without an entry yet fall
// back to FALLBACK_CATEGORY_IMAGES (round-robin) so nothing ever 404s.
const STYLE_IMAGES: Record<string, string> = {
  'salsa':         '/categorias/salsa.jpg',
  'bachata':       '/categorias/bachata.jpg',
  'heels':         '/categorias/hills.jpg',
  'reggaeton':     '/categorias/Reggaeton.jpg',
  'hip-hop':       '/categorias/hiphop.jpeg',
  'urbano':        '/categorias/urbano.jpg',
  'contemporaneo': '/categorias/comtempo.jpeg',
  'ballet':        '/categorias/ballet.jpg',
  'jazz-funk':     '/categorias/jazzfunk.png',
};

// Which styles show in the Home category strip, and in what order — purely
// a display choice for this page, independent of dance_styles.ord (which
// still governs the Crear Clase dropdown, filters, etc. elsewhere). Swap
// entries here instead of touching the catalog's real ordering.
const HOME_CATEGORY_SLUGS = [
  'salsa', 'bachata', 'heels', 'reggaeton', 'hip-hop',
  'urbano', 'contemporaneo', 'ballet', 'jazz-funk',
];

const FALLBACK_CATEGORY_IMAGES = [
  '/categorias/rainier-ridao-GRDpPpKczdY-unsplash.jpg',
  '/categorias/barrett-smith-uB4cOqtOf90-unsplash.jpg',
];

// Fallback gradients shown behind the photo while it loads (also color variety across cards)
const CATEGORY_GRADIENTS = [
  'linear-gradient(135deg, #8a11bc 0%, #4a0a67 100%)',
  'linear-gradient(135deg, #A8C8F8 0%, #4b6fd6 100%)',
  'linear-gradient(135deg, #00D68F 0%, #00745A 100%)',
  'linear-gradient(135deg, #d499f0 0%, #8a11bc 100%)',
  'linear-gradient(135deg, #FFE040 0%, #d68f2f 100%)',
  'linear-gradient(135deg, #e8c5f7 0%, #6d0d97 100%)',
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
            <p className="text-neutral-500 text-[15px] mt-1">Las clases de {style} más populares</p>
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
              <ClassCard cls={cls} compact />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function HomeClient({ initialClasses, featuredCategories, initialTeachers, initialAcademias, danceStyles, stats }: Props) {
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
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const supabase = createClient();
        const [{ data: classes }, { data: profiles }] = await Promise.all([
          supabase
            .from('classes')
            .select('id, title, type, class_styles(dance_styles(name))')
            .eq('status', 'published')
            .ilike('title', `%${q}%`)
            .limit(4),
          supabase
            .from('profiles')
            .select('id, name, role, districts(city), photo_url')
            .in('role', ['profesor', 'academia'])
            .ilike('name', `%${q}%`)
            .limit(3),
        ]);
        setSuggestions({ classes: classes ?? [], profiles: profiles ?? [] });
        setShowSuggestions(true);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
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

  const navigateSearch = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    router.push(`/clases?${params.toString()}`);
    setShowSuggestions(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigateSearch();
  };

  const hasSuggestions = query.trim().length >= 2 && (suggestions.classes.length > 0 || suggestions.profiles.length > 0);

  return (
    <div className="min-h-screen bg-white">

      {/* ── HERO ── */}
      <div className="hero-section">
        <Header transparent={true} />

        <div className="max-w-[1200px] mx-auto px-6 pt-16 pb-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left */}
            <div>
              <div className="badge-black mb-8 text-xs tracking-wider uppercase">
                🌎 Latinoamérica · Plataforma de danza
              </div>

              <h1 className="text-[48px] lg:text-[66px] font-black tracking-tighter text-white leading-none mb-6">
                Donde la pasión<br />
                por la danza<br />
                cobra vida.
              </h1>

              <p className="text-[17px] text-white/80 mb-10 leading-relaxed max-w-md">
                Encuentra clases de baile, audiciones, shows, eventos culturales y tiendas especializadas.
              </p>

              {/* ── Search bar with autocomplete ── */}
              <div className="relative max-w-xl mb-8" ref={searchRef}>
                <form
                  onSubmit={handleSearch}
                  className="bg-white rounded-full shadow-md border border-neutral-900 pl-5 pr-1.5 py-1.5 flex items-center gap-2"
                >
                  <div className="flex-1 flex items-center gap-2.5 min-w-0">
                    <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Salsa, heels, bachata, jazz funk…"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      onFocus={() => {
                        if (query.trim().length >= 2 && hasSuggestions) setShowSuggestions(true);
                      }}
                      className="flex-1 min-w-0 text-[15px] text-neutral-800 placeholder:text-neutral-400 outline-none bg-transparent"
                    />
                    {isSearching && <Loader2 className="w-4 h-4 text-neutral-400 animate-spin shrink-0" />}
                  </div>
                  <button type="submit" className="btn-hero text-[15px] px-6 py-3">
                    Buscar
                  </button>
                </form>

                {/* Autocomplete dropdown */}
                {showSuggestions && (isSearching || hasSuggestions || query.trim().length >= 2) && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-2xl border border-neutral-200 z-50 overflow-hidden origin-top transition-[opacity,transform] duration-150 ease-out starting:opacity-0 starting:scale-95">

                    {isSearching && (
                      <div className="flex items-center gap-2 px-4 py-3 text-[13px] text-neutral-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando…
                      </div>
                    )}

                    {!isSearching && !hasSuggestions && (
                      <p className="px-4 py-3 text-[13px] text-neutral-400">
                        Sin resultados para &ldquo;{query}&rdquo;
                      </p>
                    )}

                    {/* Classes */}
                    {suggestions.classes.length > 0 && (
                      <div>
                        <div className="px-4 pt-3 pb-1">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Clases</span>
                        </div>
                        {suggestions.classes.map(cls => (
                          <button
                            key={cls.id}
                            type="button"
                            onClick={() => { router.push(`/clases/${cls.id}`); setShowSuggestions(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-primary-bg flex items-center justify-center shrink-0 text-sm">
                              💃
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] font-semibold text-neutral-900 truncate">{cls.title}</p>
                              <p className="text-[11px] text-neutral-400">{cls.class_styles?.[0]?.dance_styles?.name ?? ''} · {getTypeLabel(cls.type)}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Profiles */}
                    {suggestions.profiles.length > 0 && (
                      <div className={suggestions.classes.length > 0 ? 'border-t border-neutral-100' : ''}>
                        <div className="px-4 pt-3 pb-1">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Profesores</span>
                        </div>
                        {suggestions.profiles.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => { router.push(`/profesores/${p.id}`); setShowSuggestions(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 transition-colors text-left"
                          >
                            {p.photo_url ? (
                              <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0">
                                <Image src={p.photo_url} alt={p.name} fill sizes="32px" className="object-cover" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-[13px] font-bold text-neutral-500 shrink-0">
                                {p.name.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] font-semibold text-neutral-900 truncate">{p.name}</p>
                              <p className="text-[11px] text-neutral-400 capitalize">{p.role}{p.districts?.city ? ` · ${p.districts.city}` : ''}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {hasSuggestions && (
                      <div className="border-t border-neutral-100 px-4 py-2.5">
                        <button
                          type="button"
                          onClick={navigateSearch}
                          className="text-[13px] text-primary font-semibold hover:underline"
                        >
                          Ver todos los resultados de &ldquo;{query}&rdquo; →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Trust items */}
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {['Profesores verificados', 'Contacto directo'].map(item => (
                  <span key={item} className="flex items-center gap-1.5 text-[13px] text-white/70">
                    <Check className="w-3.5 h-3.5 text-white" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — Cutout photo + floating stats */}
            <div className="hidden lg:block relative h-[460px]">
              {/* Glow behind the cutout */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[420px] h-[420px] rounded-full bg-white/20 blur-3xl" />
              </div>

              <div className="absolute inset-0 flex items-end justify-center">
                <Image
                  src="/img-portada-kynea.png"
                  alt="Bailarina en movimiento"
                  width={640}
                  height={452}
                  priority
                  className="relative w-auto h-full max-w-none object-contain"
                />
              </div>

              <div className="absolute top-6 left-0 bg-white border border-neutral-900 rounded-2xl px-5 py-3.5 shadow-xl animate-float-slow">
                <p className="text-[26px] font-black tracking-tighter text-neutral-900 leading-none">{stats.classes}+</p>
                <p className="text-[12px] text-neutral-500 mt-0.5">Clases disponibles</p>
              </div>

              <div className="absolute top-6 right-0 bg-neutral-900 border border-neutral-900 rounded-2xl px-5 py-3.5 shadow-xl animate-float-slow-2">
                <p className="text-[26px] font-black tracking-tighter text-white leading-none">{stats.teachers}+</p>
                <p className="text-[12px] text-neutral-400 mt-0.5">Profesores verificados</p>
              </div>

              <div className="absolute bottom-8 right-6 bg-white border border-neutral-900 rounded-2xl px-4.5 py-3 shadow-xl animate-float-slow [animation-delay:1s]">
                <p className="text-[22px] font-black tracking-tighter text-neutral-900 leading-none">{stats.styles}</p>
                <p className="text-[12px] text-neutral-500 mt-0.5">Estilos de baile</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CATEGORÍAS ── */}
      <section className="bg-white py-8">
        <div className="max-w-[1200px] mx-auto px-6">
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/0 transition-opacity duration-200 group-hover:from-black/60" />

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
              <h2 className="text-[30px] font-extrabold text-neutral-900 tracking-snug">Clases esta semana</h2>
              <p className="text-neutral-500 text-[15px] mt-1">Seleccionadas para ti</p>
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
                    <ClassCard cls={cls} compact />
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

      {/* ── PROFESORES DESTACADOS ── */}
      {initialTeachers.length > 0 && (
        <section className="bg-white py-16">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="flex items-end justify-between gap-6 mb-7 flex-wrap">
              <div>
                <h2 className="text-[27px] font-extrabold text-neutral-900 tracking-tight">Profesores destacados</h2>
                <p className="text-neutral-500 text-[15px] mt-1">Los mejores instructores de Latinoamérica</p>
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
                    href={`/profesores/${t.id}`}
                    className="shrink-0 w-[210px] rounded-2xl border border-neutral-200 bg-white overflow-hidden transition-[box-shadow,border-color,transform] duration-150 ease-out hover:border-neutral-300 hover:shadow-[0_12px_28px_rgba(17,17,17,0.08)] hover:-translate-y-0.5 active:scale-[0.98]"
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    <div className={`relative w-full aspect-square flex items-center justify-center ${avatar.bg}`}>
                      {t.photo ? (
                        <Image
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
                          {t.experience} {t.experience === 1 ? 'año' : 'años'}
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
            <p className="text-neutral-500 text-[15px]">Encuentra tu clase en tres pasos simples</p>
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
                    <p className="text-[15px] text-neutral-500 leading-relaxed">{item.desc}</p>
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

      {/* ── ACADEMIAS ── */}
      {initialAcademias.length > 0 && (
        <section className="bg-neutral-50 py-16">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-[30px] font-extrabold text-neutral-900 tracking-snug">Academias</h2>
                <p className="text-neutral-500 text-[15px] mt-1">Espacios de danza en toda Latinoamérica</p>
              </div>
              <Link href="/profesores?type=academia" className="hidden sm:flex items-center gap-1 text-[15px] text-primary font-semibold hover:text-primary-dark transition-colors">
                Ver todas <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {initialAcademias.map(t => (
                <Link
                  key={t.id}
                  href={`/profesores/${t.id}`}
                  className="card-hover flex items-start gap-4 group"
                >
                  <div className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-neutral-200 transition-transform duration-300 group-hover:scale-105">
                    {t.photo ? (
                      <Image
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
                      <p className="text-[13px] text-neutral-500 mb-2">
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

      {/* ── CTA PROFESORES ── */}
      <section className="hero-section py-20">
        <div className="max-w-[880px] mx-auto px-6 text-center">
          <h2 className="text-[38px] font-black tracking-snug text-white mb-4">
            ¿Eres profesor o academia?
          </h2>
          <p className="text-[17px] text-white/80 mb-10 max-w-xl mx-auto leading-relaxed">
            Publica tus clases gratis y llega a cientos de alumnos en toda Latinoamérica. Sin comisiones.
          </p>
          <div className="flex justify-center">
            <Link href="/registro" className="btn-hero">Publicar mi primera clase →</Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-neutral-200 py-10">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Image src="/logo.png" alt="Kynea" width={90} height={30} />
            <p className="text-[13px] text-neutral-400">© 2026 Kynea. La primera plataforma integral de danza en Latinoamérica.</p>
            <div className="flex gap-6 text-[13px] text-neutral-400">
              {['Términos', 'Privacidad', 'Contacto'].map(l => (
                <Link key={l} href="#" className="hover:text-neutral-700 transition-colors">{l}</Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
