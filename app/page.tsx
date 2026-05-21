'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search, MapPin, ArrowRight, Star, ChevronRight, Check } from 'lucide-react';
import Header from '@/components/Header';
import ClassCard from '@/components/ClassCard';
import { mockClasses, mockTeachers } from '@/lib/mockData';

const CATEGORIES = [
  { name: 'Salsa', emoji: '🌶️' },
  { name: 'Bachata', emoji: '🌹' },
  { name: 'Heels', emoji: '👠' },
  { name: 'Hip Hop', emoji: '🎤' },
  { name: 'Jazz Funk', emoji: '🎷' },
  { name: 'K-pop', emoji: '⭐' },
  { name: 'Contemporáneo', emoji: '🎭' },
  { name: 'Ballet', emoji: '🩰' },
  { name: 'Breakdance', emoji: '🔥' },
];

const HOW_IT_WORKS = [
  { step: '1', title: 'Busca tu estilo', desc: 'Filtra por ciudad, día, nivel y estilo de baile.' },
  { step: '2', title: 'Elige tu clase', desc: 'Revisa el perfil del profesor, horarios y precio.' },
  { step: '3', title: 'Contacta directo', desc: 'Escríbele por WhatsApp y reserva tu cupo.' },
];

const TRUST_ITEMS = [
  'Profesores verificados',
  'Información actualizada',
  'Contacto directo sin intermediarios',
  'Vista en mapa interactivo',
];

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('Lima');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (city) params.set('city', city);
    router.push(`/buscar?${params.toString()}`);
  };

  const featured = mockClasses.filter(c => c.status === 'active').slice(0, 3);

  return (
    <div className="min-h-screen bg-white">

      {/* ── HERO ── */}
      <div className="bg-[#F5F0FF]">
        <Header transparent={false} />

        <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-16 pb-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                🇵🇪 La primera plataforma de danza en el Perú
              </div>
              <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-4">
                Encuentra tu próxima<br />
                <span className="text-purple-700">clase de danza</span>
              </h1>
              <p className="text-lg text-gray-500 mb-8 leading-relaxed max-w-md">
                Conecta con los mejores profesores y academias del Perú. Clases presenciales y online, en tu ciudad.
              </p>

              {/* Search bar */}
              <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2 flex flex-col sm:flex-row gap-2 max-w-xl">
                <div className="flex-1 flex items-center gap-2.5 px-3 py-1">
                  <Search className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Salsa, heels, bachata, jazz funk…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none"
                  />
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3 border-l border-gray-100">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                  <select
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="text-sm text-gray-600 outline-none bg-transparent py-1 cursor-pointer"
                  >
                    {['Lima', 'Arequipa', 'Cusco', 'Trujillo', 'Piura'].map(c => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
                >
                  Buscar
                </button>
              </form>

              {/* Trust */}
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
                {TRUST_ITEMS.map(item => (
                  <span key={item} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Check className="w-3.5 h-3.5 text-purple-600" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — Stats cards */}
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {[
                { value: '240+', label: 'Clases activas', bg: 'bg-white' },
                { value: '80+', label: 'Profesores verificados', bg: 'bg-purple-700 text-white' },
                { value: '19', label: 'Estilos de baile', bg: 'bg-white' },
                { value: '5', label: 'Ciudades en Perú', bg: 'bg-white' },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className={`${stat.bg} rounded-2xl p-6 shadow-sm border border-white/60 ${i === 1 ? 'text-white' : ''}`}
                >
                  <p className={`text-3xl font-extrabold ${i === 1 ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>
                  <p className={`text-sm mt-1 ${i === 1 ? 'text-purple-200' : 'text-gray-500'}`}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CATEGORÍAS ── */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">Explora por estilo</h2>
            <p className="text-gray-500 text-sm mt-1">¿Qué quieres bailar hoy?</p>
          </div>
          <Link href="/buscar" className="hidden sm:flex items-center gap-1 text-sm text-purple-700 font-semibold hover:underline">
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex flex-wrap gap-3">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.name}
              href={`/buscar?style=${encodeURIComponent(cat.name)}`}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:border-purple-400 hover:bg-purple-50 rounded-full text-sm font-medium text-gray-700 hover:text-purple-700 transition-all"
            >
              <span>{cat.emoji}</span>
              {cat.name}
            </Link>
          ))}
        </div>
      </section>

      {/* ── CLASES DESTACADAS ── */}
      <section className="bg-[#FAFAFA] py-16">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900">Clases disponibles esta semana</h2>
              <p className="text-gray-500 text-sm mt-1">Seleccionadas para ti en Lima</p>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <Link href="/mapa" className="text-sm text-gray-500 font-medium hover:text-gray-800 border border-gray-200 px-4 py-2 rounded-full hover:border-gray-300 transition-colors">
                Ver en mapa
              </Link>
              <Link href="/buscar" className="flex items-center gap-1 text-sm text-purple-700 font-semibold hover:underline">
                Ver todas <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map(cls => <ClassCard key={cls.id} cls={cls} />)}
          </div>
          <div className="mt-8 text-center sm:hidden">
            <Link href="/buscar" className="text-sm text-purple-700 font-semibold border border-purple-200 px-6 py-2.5 rounded-full hover:bg-purple-50 transition-colors">
              Ver todas las clases
            </Link>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">¿Cómo funciona?</h2>
          <p className="text-gray-500">Encuentra tu clase en tres pasos simples</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map(item => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 bg-purple-700 text-white rounded-full flex items-center justify-center text-lg font-extrabold mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROFESORES DESTACADOS ── */}
      <section className="bg-[#FAFAFA] py-16">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900">Profesores y academias</h2>
              <p className="text-gray-500 text-sm mt-1">Los mejores del Perú en un solo lugar</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {mockTeachers.map(t => (
              <div key={t.id} className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:border-purple-100 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <img src={t.photo} alt={t.name} className="w-12 h-12 rounded-full object-cover border-2 border-gray-100" />
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm leading-tight">{t.name}</h3>
                    <p className="text-xs text-gray-400 capitalize mt-0.5">{t.type}</p>
                  </div>
                </div>
                {t.rating && (
                  <div className="flex items-center gap-1 mb-3">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-bold text-gray-800">{t.rating}</span>
                    <span className="text-xs text-gray-400">({t.totalClasses} clases)</span>
                  </div>
                )}
                <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">{t.bio}</p>
                <div className="flex flex-wrap gap-1">
                  {t.styles.slice(0, 2).map(s => (
                    <span key={s} className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium">{s}</span>
                  ))}
                  {t.styles.length > 2 && (
                    <span className="text-xs text-gray-400 px-2 py-1">+{t.styles.length - 2}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA PROFESORES ── */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-5 lg:px-8">
          <div className="bg-purple-700 rounded-3xl px-8 py-14 lg:px-16 text-center">
            <h2 className="text-3xl font-extrabold text-white mb-3">
              ¿Eres profesor o academia?
            </h2>
            <p className="text-purple-200 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
              Publica tus clases gratis y llega a cientos de alumnos en todo el Perú.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth?tab=register"
                className="bg-white text-purple-700 font-bold px-8 py-3.5 rounded-full hover:bg-purple-50 transition-colors text-sm"
              >
                Publicar mi primera clase
              </Link>
              <Link
                href="/dashboard"
                className="border border-white/40 text-white font-semibold px-8 py-3.5 rounded-full hover:bg-white/10 transition-colors text-sm"
              >
                Ver demo del panel →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 py-10">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Image src="/logo.svg" alt="Kynea" width={90} height={30} />
            <p className="text-sm text-gray-400">© 2026 Kynea. La primera plataforma integral de danza en el Perú.</p>
            <div className="flex gap-6 text-sm text-gray-400">
              {['Términos', 'Privacidad', 'Contacto'].map(l => (
                <Link key={l} href="#" className="hover:text-gray-700 transition-colors">{l}</Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
