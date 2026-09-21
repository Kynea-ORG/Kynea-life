'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ClassCard from '@/components/ClassCard';
import SmartImage from '@/components/SmartImage';
import TrackedProfileLink from '@/components/TrackedProfileLink';
import { Sparkles, Search, ArrowRight } from 'lucide-react';
import { recordRecentSearch } from '@/lib/recentSearches';
import { trackRecentSearchAdded } from '@/lib/analytics';
import { getValidClassBadges } from '@/lib/ai/badges';
import type { DanceClass, Teacher } from '@/lib/types';


type Tab = 'clases' | 'profesores' | 'academias';

const POPULAR_SEARCH_SUGGESTIONS = ['Salsa', 'Bachata', 'Reggaetón', 'Urbano', 'Heels', 'Ballet'];

function EmptySection({ query, tab }: { query: string; tab: Tab }) {
  const tabTitles: Record<Tab, { title: string; subtitle: string }> = {
    clases: {
      title: `No encontramos clases para “${query}”`,
      subtitle: 'Prueba buscando con términos más generales, quitando restricciones de horario o explorando nuestros estilos más populares.',
    },
    profesores: {
      title: `No encontramos profesores para “${query}”`,
      subtitle: 'No hay profesores registrados que coincidan directamente con esta búsqueda. Puedes buscar por su nombre o especialidad.',
    },
    academias: {
      title: `No encontramos academias para “${query}”`,
      subtitle: 'No hay academias registradas que coincidan con este nombre o zona.',
    },
  };

  const { title, subtitle } = tabTitles[tab];

  return (
    <div className="text-center py-16 px-4 bg-neutral-50/70 border border-neutral-200/70 rounded-3xl my-4">
      <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs flex items-center justify-center text-neutral-400 mx-auto mb-4">
        <Search className="w-6 h-6 text-neutral-400" />
      </div>

      <h3 className="text-[18px] sm:text-[20px] font-bold text-neutral-900 mb-2">
        {title}
      </h3>
      <p className="text-[14px] sm:text-[15px] text-neutral-600 max-w-[480px] mx-auto leading-relaxed mb-6">
        {subtitle}
      </p>

      {tab === 'clases' && (
        <div className="flex flex-col items-center gap-2.5 mb-7">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            Estilos populares
          </span>
          <div className="flex flex-wrap justify-center gap-2 max-w-[460px]">
            {POPULAR_SEARCH_SUGGESTIONS.map(style => (
              <Link
                key={style}
                href={`/resultados?q=${encodeURIComponent(style)}`}
                className="text-[13px] font-semibold bg-white hover:bg-neutral-100 text-neutral-700 px-3.5 py-1.5 rounded-full border border-neutral-200 shadow-2xs transition-colors active:scale-95"
              >
                {style}
              </Link>
            ))}
          </div>
        </div>
      )}

      <Link
        href="/clases"
        className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white text-[14px] font-bold px-6 py-3 rounded-full transition-all shadow-xs hover:-translate-y-0.5 active:scale-95"
      >
        <span>Explorar todas las clases</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function ProfileResultCard({ teacher, listName }: { teacher: Teacher; listName: string }) {
  const href = teacher.type === 'academia' ? `/academias/${teacher.slug}` : `/profesores/${teacher.slug}`;
  return (
    <TrackedProfileLink
      href={href}
      role={teacher.type}
      profileId={teacher.id}
      profileName={teacher.name}
      listName={listName}
      className="flex items-center gap-4 border border-neutral-200 rounded-2xl p-4 transition-[box-shadow,border-color,transform] duration-150 ease-out hover:border-neutral-300 hover:shadow-[0_12px_28px_rgba(17,17,17,0.08)] hover:-translate-y-0.5 active:scale-[0.98] group"
    >
      <div className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-neutral-200 group-hover:scale-105 transition-transform duration-200">
        {teacher.photo ? (
          <SmartImage
            src={teacher.photo}
            alt={teacher.name}
            fill
            sizes="64px"
            className="object-cover"
            style={{ objectPosition: teacher.photoPosition || '50% 50%', transform: `scale(${teacher.photoZoom || 1})` }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xl font-black text-neutral-400 select-none">{teacher.name.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-neutral-900 text-[15px] truncate">{teacher.name}</h3>
          <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 shrink-0">
            {teacher.type === 'academia' ? 'Academia' : 'Profesor'}
          </span>
        </div>
        {teacher.styles.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {teacher.styles.slice(0, 3).map(s => (
              <span key={s} className="badge-pink text-[11px] px-2 py-0.5">{s}</span>
            ))}
          </div>
        )}
      </div>
    </TrackedProfileLink>
  );
}

export default function ResultadosClient({
  query,
  classes,
  profesores,
  academias,
  aiSummary,
  matchBadges,
}: {
  query: string;
  classes: DanceClass[];
  profesores: Teacher[];
  academias: Teacher[];
  aiSummary?: string | null;
  matchBadges?: string[];
}) {
  // La primera pestaña con resultados, no siempre "Clases" — buscar "Zeus"
  // (0 clases, 1 profesor) no debería aterrizar en una pestaña vacía.
  // Si no hay resultados en ninguna pestaña, se mantiene en "clases".
  const defaultTab: Tab = classes.length > 0
    ? 'clases'
    : profesores.length > 0
      ? 'profesores'
      : academias.length > 0
        ? 'academias'
        : 'clases';
  const [tab, setTab] = useState<Tab>(defaultTab);


  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'clases', label: 'Clases', count: classes.length },
    { key: 'profesores', label: 'Profesores', count: profesores.length },
    { key: 'academias', label: 'Academias', count: academias.length },
  ];
  const totalResults = classes.length + profesores.length + academias.length;

  const searchParams = useSearchParams();
  useEffect(() => {
    // Esta ruta se llega tanto desde el buscador del Home (búsqueda
    // ambigua) como por link directo — en ambos casos, "búsqueda reciente"
    // solo debe guardarse si de verdad encontró algo, nunca un intento
    // vacío (ver la queja original: "clases de salsa" sin resultados no
    // debería aparecer en Búsquedas recientes).
    if (totalResults === 0) return;
    const href = `/resultados?${searchParams.toString()}`;
    recordRecentSearch({ query, href, resultLabel: '' });
    trackRecentSearchAdded({ query, classId: '', classStyle: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, totalResults]);

  // Badges que realmente están presentes en al menos una clase mostrada
  const activeBadges = (matchBadges ?? []).filter(b =>
    classes.some(cls => getValidClassBadges(cls, [b]).length > 0)
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-10 animate-fade-in-smooth">
        <h1 className="text-[26px] sm:text-[32px] font-black text-neutral-900 mb-1 break-words">
          Resultados para &ldquo;{query}&rdquo;
        </h1>
        <p className="text-neutral-600 mb-6">
          {totalResults} resultado{totalResults !== 1 ? 's' : ''} en total
        </p>

        {aiSummary && (
          <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-primary-bg via-pink-50/40 to-white border border-primary/20 flex items-start gap-3.5 shadow-xs">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Búsqueda Inteligente</span>
              </div>
              <p className="text-[15px] sm:text-[15.5px] font-semibold text-neutral-900 leading-snug">{aiSummary}</p>
              {activeBadges.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {activeBadges.map(b => (
                    <span
                      key={b}
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold bg-white/95 text-neutral-800 px-3 py-1 rounded-full border border-primary/20 shadow-2xs transition-transform hover:scale-[1.02]"
                    >
                      <Sparkles className="w-3 h-3 text-primary shrink-0" />
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-1 mb-8 bg-neutral-100 rounded-xl p-1 w-fit overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-[background-color,color,box-shadow] active:scale-[0.97] ${
                tab === t.key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-700'
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {tab === 'clases' && (
          classes.length === 0 ? (
            <EmptySection query={query} tab="clases" />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {classes.map(cls => (
                <ClassCard
                  key={cls.id}
                  cls={cls}
                  listName="resultados"
                  matchBadges={getValidClassBadges(cls, activeBadges)}
                />
              ))}
            </div>
          )
        )}

        {tab === 'profesores' && (
          profesores.length === 0 ? (
            <EmptySection query={query} tab="profesores" />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {profesores.map(p => <ProfileResultCard key={p.id} teacher={p} listName="resultados" />)}
            </div>
          )
        )}

        {tab === 'academias' && (
          academias.length === 0 ? (
            <EmptySection query={query} tab="academias" />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {academias.map(a => <ProfileResultCard key={a.id} teacher={a} listName="resultados" />)}
            </div>
          )
        )}

        <div className="mt-10">
          <Link href="/clases" className="text-[14px] font-semibold text-primary hover:text-primary-dark">
            ← Explorar todas las clases
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
