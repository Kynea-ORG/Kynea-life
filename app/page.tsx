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
import { mockClasses, mockTeachers, getTypeLabel } from '@/lib/mockData';
import { createClient } from '@/lib/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────────
interface SearchClass  { id: string; title: string; style: string; type: string }
interface SearchProfile { id: string; name: string; role: string; city: string; photo_url: string | null }

// ── Category definitions ───────────────────────────────────────────────────
const CATEGORIES = [
  { name: 'Salsa' },
  { name: 'Bachata' },
  { name: 'Heels' },
  { name: 'Hip Hop' },
  { name: 'Jazz Funk' },
  { name: 'K-pop' },
  { name: 'Contemporáneo' },
  { name: 'Ballet' },
  { name: 'Breakdance' },
];

const CLASS_TABS = ['Todas', 'Salsa', 'Heels', 'Hip Hop'];

const HOW_IT_WORKS = [
  { step: '1', Icon: Search,       title: 'Busca tu estilo',   desc: 'Filtra por ciudad, día, nivel y estilo de baile.' },
  { step: '2', Icon: CalendarCheck, title: 'Elige tu clase',   desc: 'Revisa el perfil del profesor, horarios y precio.' },
  { step: '3', Icon: MessageCircle, title: 'Contacta directo', desc: 'Escríbele por WhatsApp y reserva tu cupo.' },
];

const EXTRA_TEACHERS = [
  {
    id: 'et1', name: 'Carlos Mendoza', type: 'profesor',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    city: 'Lima', district: 'San Isidro',
    bio: 'Especialista en salsa on2 y bachata moderna.',
    experience: 8, styles: ['Salsa', 'Bachata'], rating: 4.8, totalClasses: 145, whatsapp: '', email: '',
  },
  {
    id: 'et2', name: 'Valentina Cruz', type: 'profesor',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
    city: 'Lima', district: 'Miraflores',
    bio: 'Instructora de heels y jazz funk con 6 años formando bailarinas.',
    experience: 6, styles: ['Heels', 'Jazz Funk'], rating: 4.9, totalClasses: 98, whatsapp: '', email: '',
  },
] as any[];

const EXTRA_ACADEMIAS = [
  {
    id: 'ea1', name: 'Centro de Danza Vivo', type: 'academia',
    photo: 'https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?w=400&q=80',
    city: 'Lima', district: 'San Borja',
    bio: 'Academia con 15 años formando bailarines profesionales.',
    experience: 15, styles: ['Ballet', 'Contemporáneo', 'Jazz'], rating: 4.7, totalClasses: 320, whatsapp: '', email: '',
  },
  {
    id: 'ea2', name: 'Urban Groove Academy', type: 'academia',
    photo: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80',
    city: 'Lima', district: 'Lince',
    bio: 'La academia de hip hop más reconocida del Perú.',
    experience: 10, styles: ['Hip Hop', 'Breakdance', 'K-pop'], rating: 4.8, totalClasses: 215, whatsapp: '', email: '',
  },
] as any[];

// ── Animated counter ──────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1500, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const numericTarget = parseInt(String(target).replace(/\D/g, ''));
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * numericTarget));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return count;
}

const STATS = [
  { target: 240, suffix: '+', label: 'Clases disponibles',     dark: false },
  { target: 80,  suffix: '+', label: 'Profesores verificados', dark: true  },
  { target: 19,  suffix: '',  label: 'Estilos de baile',       dark: false },
  { target: 5,   suffix: '',  label: 'Ciudades en Perú',       dark: false },
];

function StatCard({ stat, visible }: { stat: typeof STATS[number]; visible: boolean }) {
  const count = useCountUp(stat.target, 1500, visible);
  return (
    <div className={`rounded-xl p-6 shadow-sm border ${stat.dark ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-white/70'}`}>
      <p className={`text-[38px] font-black leading-none tracking-tighter mb-1 ${stat.dark ? 'text-white' : 'text-neutral-900'}`}>
        {count}{stat.suffix}
      </p>
      <p className={`text-[13px] ${stat.dark ? 'text-neutral-400' : 'text-neutral-500'}`}>{stat.label}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [query, setQuery]         = useState('');
  const [city, setCity]           = useState('Lima');
  const [activeTab, setActiveTab] = useState('Todas');

  // ── Search autocomplete ──
  const [suggestions, setSuggestions]       = useState<{ classes: SearchClass[]; profiles: SearchProfile[] }>({ classes: [], profiles: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching]       = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions({ classes: [], profiles: [] });
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const supabase = createClient();
        const [{ data: classes }, { data: profiles }] = await Promise.all([
          supabase
            .from('classes')
            .select('id, title, style, type')
            .eq('status', 'published')
            .or(`title.ilike.%${q}%,style.ilike.%${q}%`)
            .limit(4),
          supabase
            .from('profiles')
            .select('id, name, role, city, photo_url')
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

  // ── Stats IntersectionObserver ──
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  // ── Carousel auto-scroll ──
  const carouselRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const interval = setInterval(() => {
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
    if (city) params.set('city', city);
    router.push(`/clases?${params.toString()}`);
    setShowSuggestions(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigateSearch();
  };

  const featured  = mockClasses.filter(c => c.status === 'published');
  const profesores = [...mockTeachers.filter(t => t.type === 'profesor'), ...EXTRA_TEACHERS];
  const academias  = [...mockTeachers.filter(t => t.type === 'academia'), ...EXTRA_ACADEMIAS];

  const hasSuggestions = suggestions.classes.length > 0 || suggestions.profiles.length > 0;

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
                🇵🇪 Perú · Plataforma de danza
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
                  className="bg-white rounded-xl shadow-md border border-neutral-200 p-2 flex gap-2"
                >
                  <div className="flex-1 flex items-center gap-2.5 px-3 py-1">
                    <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Salsa, heels, bachata, jazz funk…"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      onFocus={() => {
                        if (query.trim().length >= 2 && hasSuggestions) setShowSuggestions(true);
                      }}
                      className="flex-1 text-[15px] text-neutral-800 placeholder:text-neutral-400 outline-none bg-transparent"
                    />
                    {isSearching && <Loader2 className="w-4 h-4 text-neutral-400 animate-spin shrink-0" />}
                  </div>
                  <div className="hidden sm:flex items-center gap-2 px-3 border-l border-neutral-200">
                    <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
                    <select
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="text-[15px] text-neutral-600 outline-none bg-transparent py-1 cursor-pointer"
                    >
                      {['Lima', 'Arequipa', 'Cusco', 'Trujillo', 'Piura'].map(c => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn-hero text-[15px] px-6 py-3">
                    Buscar
                  </button>
                </form>

                {/* Autocomplete dropdown */}
                {showSuggestions && (isSearching || hasSuggestions || query.trim().length >= 2) && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-2xl border border-neutral-200 z-50 overflow-hidden">

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
                              <p className="text-[11px] text-neutral-400">{cls.style} · {getTypeLabel(cls.type)}</p>
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
                              <img src={p.photo_url} alt={p.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-[13px] font-bold text-neutral-500 shrink-0">
                                {p.name.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] font-semibold text-neutral-900 truncate">{p.name}</p>
                              <p className="text-[11px] text-neutral-400 capitalize">{p.role} · {p.city}</p>
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

            {/* Right — Stats */}
            <div ref={statsRef} className="hidden lg:grid grid-cols-2 gap-4">
              {STATS.map(stat => (
                <StatCard key={stat.label} stat={stat} visible={statsVisible} />
              ))}
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
            {CATEGORIES.map(cat => (
              <Link
                key={cat.name}
                href={`/clases?style=${encodeURIComponent(cat.name)}`}
                className="relative shrink-0 w-[168px] h-[152px] rounded-2xl cursor-pointer group select-none block"
              >
                {/* Base: lavender solid */}
                <div className="absolute inset-0 bg-[#f0e6fc] rounded-2xl transition-opacity duration-300 group-hover:opacity-0" />

                {/* Hover: white + purple radial glow */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: 'radial-gradient(ellipse at 55% 45%, rgba(150, 70, 220, 0.38) 0%, rgba(185, 120, 255, 0.16) 48%, #ffffff 76%)',
                  }}
                />

                {/* Border — only on hover */}
                <div className="absolute inset-0 rounded-2xl border-[3px] border-transparent group-hover:border-neutral-900 transition-colors duration-200 pointer-events-none" />

                {/* Content: icon top-left, name bottom-left */}
                <div className="relative z-10 p-4 h-full flex flex-col justify-between">
                  <img
                    src="/Icon-categorias.png"
                    alt=""
                    aria-hidden="true"
                    className="w-12 h-12 object-contain self-start"
                  />
                  <p className="text-[17px] font-black text-neutral-900 tracking-tight leading-none">
                    {cat.name}
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
              <p className="text-neutral-500 text-[15px] mt-1">Seleccionadas para ti en Lima</p>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <Link href="/clases" className="flex items-center gap-1 text-[15px] text-neutral-900 font-semibold hover:underline">
                Ver todas <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-1 mb-8 border-b border-neutral-200">
            {CLASS_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-[14px] font-semibold px-4 py-2.5 transition-all duration-150 border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-400 hover:text-neutral-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative">
            <button
              onClick={() => carouselRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
              className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-neutral-200 rounded-full shadow-sm items-center justify-center hover:bg-neutral-50 transition-colors hidden sm:flex"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-600" />
            </button>

            <div
              ref={carouselRef}
              className="flex gap-4 overflow-x-auto pb-4"
              style={{ scrollbarWidth: 'none', scrollSnapType: 'x mandatory', msOverflowStyle: 'none' } as React.CSSProperties}
            >
              {featured.map(cls => (
                <div key={cls.id} className="shrink-0 w-72 sm:w-80" style={{ scrollSnapAlign: 'start' }}>
                  <ClassCard cls={cls} compact />
                </div>
              ))}
            </div>

            <button
              onClick={() => carouselRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
              className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-neutral-200 rounded-full shadow-sm items-center justify-center hover:bg-neutral-50 transition-colors hidden sm:flex"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-5 h-5 text-neutral-600" />
            </button>
          </div>

          <div className="mt-6 text-center sm:hidden">
            <Link href="/clases" className="btn-outline">Ver todas las clases</Link>
          </div>
        </div>
      </section>

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

      {/* ── PROFESORES DESTACADOS ── */}
      <section className="bg-white py-16 border-t border-neutral-100">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-[30px] font-extrabold text-neutral-900 tracking-snug">Profesores destacados</h2>
              <p className="text-neutral-500 text-[15px] mt-1">Los mejores instructores del Perú</p>
            </div>
            <Link href="/profesores" className="hidden sm:flex items-center gap-1 text-[15px] text-neutral-900 font-semibold hover:underline">
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {profesores.map((t: any) => (
              <Link
                key={t.id}
                href={`/profesores/${t.id}`}
                className="card-hover overflow-hidden p-0 block group rounded-xl border border-neutral-100"
              >
                <div className="w-full h-56 overflow-hidden rounded-t-xl">
                  <img
                    src={t.photo}
                    alt={t.name}
                    className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-neutral-900 text-[15px] leading-tight mb-1">{t.name}</h3>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {t.styles.slice(0, 2).map((s: string) => (
                      <span key={s} className="badge-pink text-[11px]">{s}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    {t.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-[13px] font-bold text-neutral-800">{t.rating}</span>
                      </div>
                    )}
                    <p className="text-[12px] text-neutral-400">{t.totalClasses} clases</p>
                  </div>
                  <span className="mt-2 block text-[12px] font-semibold text-neutral-900 hover:underline">Ver perfil →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── ACADEMIAS ── */}
      <section className="bg-neutral-50 py-16">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-[30px] font-extrabold text-neutral-900 tracking-snug">Academias</h2>
              <p className="text-neutral-500 text-[15px] mt-1">Espacios de danza en todo el Perú</p>
            </div>
            <Link href="/profesores?type=academia" className="hidden sm:flex items-center gap-1 text-[15px] text-neutral-900 font-semibold hover:underline">
              Ver todas <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {academias.map((t: any) => (
              <Link
                key={t.id}
                href={`/profesores/${t.id}`}
                className="card-hover flex items-start gap-4 group"
              >
                <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden">
                  <img
                    src={t.photo}
                    alt={t.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
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
                  <p className="text-[13px] text-neutral-500 mb-2">
                    <MapPin className="w-3 h-3 inline mr-0.5 -mt-px" />
                    {t.district}, {t.city}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {t.styles.slice(0, 3).map((s: string) => (
                      <span key={s} className="badge-pink text-[11px]">{s}</span>
                    ))}
                    {t.styles.length > 3 && (
                      <span className="text-[11px] text-neutral-400 px-1">+{t.styles.length - 3}</span>
                    )}
                  </div>
                  <p className="text-[12px] text-neutral-400">{t.totalClasses} clases publicadas</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA PROFESORES ── */}
      <section className="hero-section py-20">
        <div className="max-w-[880px] mx-auto px-6 text-center">
          <h2 className="text-[38px] font-black tracking-snug text-white mb-4">
            ¿Eres profesor o academia?
          </h2>
          <p className="text-[17px] text-white/80 mb-10 max-w-xl mx-auto leading-relaxed">
            Publica tus clases gratis y llega a cientos de alumnos en todo el Perú. Sin comisiones.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/registro" className="btn-hero">Publicar mi primera clase →</Link>
            <Link href="/dashboard" className="btn-hero-white">Ver demo del panel</Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-neutral-200 py-10">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Image src="/logo.png" alt="Kynea" width={90} height={30} />
            <p className="text-[13px] text-neutral-400">© 2026 Kynea. La primera plataforma integral de danza en el Perú.</p>
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
