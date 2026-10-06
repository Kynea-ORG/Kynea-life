'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ClassCard from '@/components/ClassCard';
import SmartImage from '@/components/SmartImage';
import TrackedProfileLink from '@/components/TrackedProfileLink';
import { Sparkles, Search, ArrowRight, X } from 'lucide-react';
import { recordRecentSearch } from '@/lib/recentSearches';
import { trackRecentSearchAdded } from '@/lib/analytics';
import { getValidClassBadges } from '@/lib/ai/badges';
import { buildFilterChips, buildRefinementHref, removeChip } from '@/lib/ai/filterParams';
import ResultadosSearchBar from './ResultadosSearchBar';
import type { DanceClass, Teacher } from '@/lib/types';
import type { AiSearchFilters } from '@/lib/ai/types';
import type { Relaxation } from '@/lib/ai/relaxations';


type Tab = 'clases' | 'profesores' | 'academias';

function plural(n: number) {
  return `${n} clase${n !== 1 ? 's' : ''}`;
}

function EmptySection({
  query, tab, relaxations = [], suggestedStyles = [],
}: { query: string; tab: Tab; relaxations?: Relaxation[]; suggestedStyles?: string[] }) {
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

      {tab === 'clases' && relaxations.length > 0 && (
        <div className="flex flex-col items-center gap-2.5 mb-7">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            Con un pequeño cambio sí hay
          </span>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2 w-full max-w-[520px]">
            {relaxations.map(r => (
              <Link
                key={`${r.kind}-${r.label}`}
                href={r.href}
                scroll={false}
                className="text-[14px] font-semibold bg-white hover:bg-primary-bg text-neutral-800 px-4 py-2 rounded-full border border-primary/25 hover:border-primary/50 shadow-2xs transition-colors active:scale-95"
              >
                {r.kind === 'city'
                  ? <>Buscar fuera de <strong>{r.label}</strong></>
                  : <>Sin <strong>{r.label}</strong></>}
                <span className="text-neutral-500 font-medium"> · {plural(r.count)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {tab === 'clases' && suggestedStyles.length > 0 && (
        <div className="flex flex-col items-center gap-2.5 mb-7">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            Estilos con clases ahora
          </span>
          <div className="flex flex-wrap justify-center gap-2 max-w-[460px]">
            {suggestedStyles.map(style => (
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
  city,
  interpretedFilters,
  interpretedTags,
  relaxations = [],
  suggestedStyles = [],
  classes,
  profesores,
  academias,
  aiSummary,
  matchBadges,
}: {
  query: string;
  city?: string;
  /** Filtros que la IA aplicó (o el usuario dejó tras editar los chips). null si la IA no interpretó. */
  interpretedFilters: AiSearchFilters | null;
  interpretedTags: string[];
  /** Solo con 0 clases: qué filtro quitar para obtener resultados (con la cantidad real). */
  relaxations?: Relaxation[];
  /** Solo con 0 clases: estilos que hoy tienen clases publicadas. */
  suggestedStyles?: string[];
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

  const chips = interpretedFilters ? buildFilterChips(interpretedFilters, interpretedTags) : [];
  const chipHref = (chip: (typeof chips)[number]) => {
    const next = removeChip(interpretedFilters!, interpretedTags, chip);
    return buildRefinementHref(query, city, next.filters, next.tags);
  };

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

        <ResultadosSearchBar query={query} city={city} />

        {(aiSummary || chips.length > 0) && (
          <section aria-label="Cómo interpretamos tu búsqueda" className="mb-8">
            {aiSummary && (
              <p className="flex items-start gap-2 text-[14px] sm:text-[15px] text-neutral-700 leading-snug mb-3">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <span>{aiSummary}</span>
              </p>
            )}
            {chips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mr-1">
                  Entendimos
                </span>
                {chips.map(chip => (
                  <Link
                    key={`${chip.kind}-${chip.label}`}
                    href={chipHref(chip)}
                    scroll={false}
                    aria-label={`Quitar filtro ${chip.label}`}
                    className="group inline-flex items-center gap-1.5 text-[13px] font-semibold bg-primary-bg text-neutral-900 pl-3 pr-2 py-1 rounded-full border border-primary/20 transition-[background-color,border-color,transform] hover:bg-white hover:border-primary/40 active:scale-95"
                  >
                    {chip.label}
                    <X className="w-3.5 h-3.5 text-neutral-400 group-hover:text-primary" aria-hidden="true" />
                  </Link>
                ))}
                {chips.length > 1 && (
                  <Link
                    href={buildRefinementHref(query, city, {}, [])}
                    scroll={false}
                    className="text-[13px] font-semibold text-neutral-500 hover:text-neutral-800 underline-offset-2 hover:underline px-1"
                  >
                    Limpiar filtros
                  </Link>
                )}
              </div>
            )}
          </section>
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
            <EmptySection query={query} tab="clases" relaxations={relaxations} suggestedStyles={suggestedStyles} />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0 md:gap-5">
              {classes.map(cls => (
                <ClassCard
                  key={cls.id}
                  cls={cls}
                  mobileLayout="row"
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
