'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Search, MapPin, ArrowRight, Star, Check, CalendarCheck, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import ClassCard from '@/components/ClassCard';
import { mockClasses, mockTeachers } from '@/lib/mockData';

// ── Category definitions with per-style color tokens ───────────────────────
const CATEGORIES = [
  { name: 'Salsa',         emoji: '🌶️', bg: 'bg-red-50',    border: 'border-red-100'    },
  { name: 'Bachata',       emoji: '🌹', bg: 'bg-rose-50',   border: 'border-rose-100'   },
  { name: 'Heels',         emoji: '👠', bg: 'bg-pink-50',   border: 'border-pink-100'   },
  { name: 'Hip Hop',       emoji: '🎤', bg: 'bg-neutral-900 text-white', border: 'border-neutral-900' },
  { name: 'Jazz Funk',     emoji: '🎷', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { name: 'K-pop',         emoji: '⭐', bg: 'bg-violet-50', border: 'border-violet-100' },
  { name: 'Contemporáneo', emoji: '🎭', bg: 'bg-sky-50',    border: 'border-sky-100'    },
  { name: 'Ballet',        emoji: '🩰', bg: 'bg-blue-50',   border: 'border-blue-100'   },
  { name: 'Breakdance',    emoji: '🔥', bg: 'bg-orange-50', border: 'border-orange-100' },
];

const CLASS_TABS = ['Todas', 'Salsa', 'Heels', 'Hip Hop'];

const HOW_IT_WORKS = [
  {
    step: '1',
    Icon: Search,
    title: 'Busca tu estilo',
    desc: 'Filtra por ciudad, día, nivel y estilo de baile.',
  },
  {
    step: '2',
    Icon: CalendarCheck,
    title: 'Elige tu clase',
    desc: 'Revisa el perfil del profesor, horarios y precio.',
  },
  {
    step: '3',
    Icon: MessageCircle,
    title: 'Contacta directo',
    desc: 'Escríbele por WhatsApp y reserva tu cupo.',
  },
];

// ── Extra teachers/academias to fill out sections ─────────────────────────
const EXTRA_TEACHERS = [
  {
    id: 'et1',
    name: 'Carlos Mendoza',
    type: 'profesor',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    city: 'Lima',
    district: 'San Isidro',
    bio: 'Especialista en salsa on2 y bachata moderna.',
    experience: 8,
    styles: ['Salsa', 'Bachata'],
    rating: 4.8,
    totalClasses: 145,
    whatsapp: '',
    email: '',
  },
  {
    id: 'et2',
    name: 'Valentina Cruz',
    type: 'profesor',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
    city: 'Lima',
    district: 'Miraflores',
    bio: 'Instructora de heels y jazz funk con 6 años formando bailarinas.',
    experience: 6,
    styles: ['Heels', 'Jazz Funk'],
    rating: 4.9,
    totalClasses: 98,
    whatsapp: '',
    email: '',
  },
] as any[];

const EXTRA_ACADEMIAS = [
  {
    id: 'ea1',
    name: 'Centro de Danza Vivo',
    type: 'academia',
    photo: 'https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?w=400&q=80',
    city: 'Lima',
    district: 'San Borja',
    bio: 'Academia con 15 años formando bailarines profesionales.',
    experience: 15,
    styles: ['Ballet', 'Contemporáneo', 'Jazz'],
    rating: 4.7,
    totalClasses: 320,
    whatsapp: '',
    email: '',
  },
  {
    id: 'ea2',
    name: 'Urban Groove Academy',
    type: 'academia',
    photo: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80',
    city: 'Lima',
    district: 'Lince',
    bio: 'La academia de hip hop más reconocida del Perú.',
    experience: 10,
    styles: ['Hip Hop', 'Breakdance', 'K-pop'],
    rating: 4.8,
    totalClasses: 215,
    whatsapp: '',
    email: '',
  },
] as any[];

// ── Animated counter hook ─────────────────────────────────────────────────
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

// ── Stats data ────────────────────────────────────────────────────────────
const STATS = [
  { target: 240, suffix: '+', label: 'Clases disponibles',      dark: false },
  { target: 80,  suffix: '+', label: 'Profesores verificados',  dark: true  },
  { target: 19,  suffix: '',  label: 'Estilos de baile',        dark: false },
  { target: 5,   suffix: '',  label: 'Ciudades en Perú',        dark: false },
];

// ── Individual stat card with its own counter ─────────────────────────────
function StatCard({ stat, visible }: { stat: typeof STATS[number]; visible: boolean }) {
  const count = useCountUp(stat.target, 1500, visible);
  return (
    <div
      className={`rounded-xl p-6 shadow-sm border ${
        stat.dark
          ? 'bg-neutral-900 border-neutral-900 text-white'
          : 'bg-white border-white/70'
      }`}
    >
      <p className={`text-[38px] font-black leading-none tracking-tighter mb-1 ${stat.dark ? 'text-white' : 'text-neutral-900'}`}>
        {count}{stat.suffix}
      </p>
      <p className={`text-[13px] ${stat.dark ? 'text-neutral-400' : 'text-neutral-500'}`}>
        {stat.label}
      </p>
    </div>
  );
}

// ── Page component ────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('Lima');
  const [activeTab, setActiveTab] = useState('Todas');

  // Stats IntersectionObserver
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

  // Carousel auto-scroll
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (city) params.set('city', city);
    router.push(`/clases?${params.toString()}`);
  };

  const featured = mockClasses.filter(c => c.status === 'published');
  const profesores = [...mockTeachers.filter(t => t.type === 'profesor'), ...EXTRA_TEACHERS];
  const academias = [...mockTeachers.filter(t => t.type === 'academia'), ...EXTRA_ACADEMIAS];

  return (
    <div className="min-h-screen bg-white">

      {/* ── HERO (fondo rosa) ── */}
      <div className="hero-section">
        <Header transparent={false} />

        <div className="max-w-[1200px] mx-auto px-6 pt-16 pb-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div>
              <div className="badge-black mb-8 text-xs tracking-wider uppercase">
                🇵🇪 Perú · Plataforma de danza
              </div>

              <h1 className="text-[48px] lg:text-[66px] font-black tracking-tighter text-neutral-900 leading-none mb-6">
                Donde la pasión<br />
                por la danza<br />
                cobra vida.
              </h1>

              <p className="text-[17px] text-neutral-700 mb-10 leading-relaxed max-w-md">
                Encuentra clases de baile, audiciones, shows, eventos culturales y tiendas especializadas.
              </p>

              {/* Search bar */}
              <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-md border border-neutral-200 p-2 flex gap-2 max-w-xl mb-8">
                <div className="flex-1 flex items-center gap-2.5 px-3 py-1">
                  <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Salsa, heels, bachata, jazz funk…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="flex-1 text-[15px] text-neutral-800 placeholder:text-neutral-400 outline-none bg-transparent"
                  />
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

              {/* Trust items */}
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {['Profesores verificados', 'Contacto directo', 'Vista en mapa'].map(item => (
                  <span key={item} className="flex items-center gap-1.5 text-[13px] text-neutral-700">
                    <Check className="w-3.5 h-3.5 text-neutral-900" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — Animated Stats cards */}
            <div ref={statsRef} className="hidden lg:grid grid-cols-2 gap-4">
              {STATS.map(stat => (
                <StatCard key={stat.label} stat={stat} visible={statsVisible} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CATEGORÍAS — colorful cards, horizontal scroll ── */}
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
                className={`shrink-0 min-w-[120px] rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-all border ${cat.bg} ${cat.border}`}
              >
                <span className="text-2xl">{cat.emoji}</span>
                <span className="text-sm font-bold text-center leading-tight">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLASES ESTA SEMANA — horizontal auto-scroll carousel ── */}
      <section className="bg-neutral-50 py-16">
        <div className="max-w-[1200px] mx-auto px-6">
          {/* Header row */}
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-[30px] font-extrabold text-neutral-900 tracking-snug">Clases esta semana</h2>
              <p className="text-neutral-500 text-[15px] mt-1">Seleccionadas para ti en Lima</p>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <Link href="/mapa" className="btn-outline btn-sm">
                Ver en mapa
              </Link>
              <Link href="/clases" className="flex items-center gap-1 text-[15px] text-neutral-900 font-semibold hover:underline">
                Ver todas <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Style filter tabs */}
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

          {/* Carousel */}
          <div className="relative">
            {/* Prev arrow */}
            <button
              onClick={() => carouselRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
              className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-neutral-200 rounded-full shadow-sm flex items-center justify-center hover:bg-neutral-50 transition-colors hidden sm:flex"
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

            {/* Next arrow */}
            <button
              onClick={() => carouselRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
              className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-neutral-200 rounded-full shadow-sm flex items-center justify-center hover:bg-neutral-50 transition-colors hidden sm:flex"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-5 h-5 text-neutral-600" />
            </button>
          </div>

          <div className="mt-6 text-center sm:hidden">
            <Link href="/clases" className="btn-outline">
              Ver todas las clases
            </Link>
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
            {HOW_IT_WORKS.map((item, idx) => {
              const { Icon } = item;
              return (
                <div key={item.step} className="flex sm:flex-col items-start sm:items-center sm:text-center flex-1 gap-5 sm:gap-0 sm:px-8">
                  {/* Step circle + icon */}
                  <div className="relative shrink-0 mb-0 sm:mb-6">
                    <div className="w-16 h-16 bg-neutral-900 text-white rounded-full flex items-center justify-center">
                      <Icon className="w-7 h-7" />
                    </div>
                    {/* Pink dot accent */}
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-400 rounded-full flex items-center justify-center text-[10px] font-black text-white">
                      {item.step}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-neutral-900 text-[17px] mb-1.5">{item.title}</h3>
                    <p className="text-[15px] text-neutral-500 leading-relaxed">{item.desc}</p>
                  </div>

                  {idx < HOW_IT_WORKS.length - 1 && (
                    <div className="hidden sm:flex absolute" style={{ display: 'none' }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop dashed connectors */}
          <div className="hidden sm:flex justify-center items-center gap-0 -mt-[88px] mb-[88px] pointer-events-none">
            <div className="flex-1" />
            <div className="flex items-center justify-center w-16">
              <div className="flex items-center gap-1 text-neutral-300">
                <span className="text-2xl font-light tracking-widest">- - -&gt;</span>
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex items-center justify-center w-16">
              <div className="flex items-center gap-1 text-neutral-300">
                <span className="text-2xl font-light tracking-widest">- - -&gt;</span>
              </div>
            </div>
            <div className="flex-1" />
          </div>

          {/* CTA */}
          <div className="flex justify-center mt-12">
            <Link href="/clases" className="btn-dark">
              Empezar a buscar →
            </Link>
          </div>
        </div>
      </section>

      {/* ── PROFESORES DESTACADOS — portrait cards, 4-column ── */}
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
                {/* Portrait photo */}
                <div className="w-full h-56 overflow-hidden rounded-t-xl">
                  <img
                    src={t.photo}
                    alt={t.name}
                    className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                {/* Info */}
                <div className="p-4">
                  <h3 className="font-bold text-neutral-900 text-[15px] leading-tight mb-1">{t.name}</h3>
                  {/* Style chips */}
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

      {/* ── ACADEMIAS — bg neutral-50, horizontal cards ── */}
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
                {/* Thumbnail */}
                <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden">
                  <img
                    src={t.photo}
                    alt={t.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                {/* Info */}
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

                  {/* Style chips */}
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

      {/* ── CTA PROFESORES (sección rosa) ── */}
      <section className="hero-section py-20">
        <div className="max-w-[880px] mx-auto px-6 text-center">
          <h2 className="text-[38px] font-black tracking-snug text-neutral-900 mb-4">
            ¿Eres profesor o academia?
          </h2>
          <p className="text-[17px] text-neutral-700 mb-10 max-w-xl mx-auto leading-relaxed">
            Publica tus clases gratis y llega a cientos de alumnos en todo el Perú. Sin comisiones.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/registro" className="btn-hero">
              Publicar mi primera clase →
            </Link>
            <Link href="/dashboard" className="btn-hero-white">
              Ver demo del panel
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-neutral-200 py-10">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Image src="/logo.svg" alt="Kynea" width={90} height={30} />
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
