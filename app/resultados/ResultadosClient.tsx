'use client';
import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ClassCard from '@/components/ClassCard';
import SmartImage from '@/components/SmartImage';
import TrackedProfileLink from '@/components/TrackedProfileLink';
import { Search, ArrowRight, X, Loader2 } from 'lucide-react';
import ClassCardSkeleton from '@/components/skeletons/ClassCardSkeleton';
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
  query, tab, relaxations = [], suggestedStyles = [], isOutOfDomain = false, onRefine,
}: {
  query: string;
  tab: Tab;
  relaxations?: Relaxation[];
  suggestedStyles?: string[];
  isOutOfDomain?: boolean;
  onRefine?: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  const tabTitles: Record<Tab, { title: string; subtitle: string }> = {
    clases: {
      title: `No encontramos clases para “${query}”`,
      subtitle: isOutOfDomain
        ? 'Kynea es una plataforma dedicada a la danza y el baile. No encontramos resultados para esta búsqueda. Te invitamos a explorar nuestros estilos disponibles:'
        : 'Prueba buscando con términos más generales, quitando restricciones de horario o explorando nuestros estilos más populares.',
    },
    profesores: {
      title: `No encontramos profesores para “${query}”`,
      subtitle: isOutOfDomain
        ? 'No encontramos profesores para esta búsqueda. Puedes buscar instructores de baile por su nombre o especialidad.'
        : 'No hay profesores registrados que coincidan directamente con esta búsqueda. Puedes buscar por su nombre o especialidad.',
    },
    academias: {
      title: `No encontramos academias para “${query}”`,
      subtitle: isOutOfDomain
        ? 'No encontramos academias para esta búsqueda. Puedes buscar academias o estudios de baile por su nombre o zona.'
        : 'No hay academias registradas que coincidan con este nombre o zona.',
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
                onClick={e => onRefine?.(e, r.href)}
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
  isOutOfDomain = false,
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
  isOutOfDomain?: boolean;
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

  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSearching, startSearchTransition] = useTransition();
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const activePendingQuery = isSearching ? pendingQuery : null;
  const [prevQuery, setPrevQuery] = useState(query);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  if (prevQuery !== query) {
    setPrevQuery(query);
    setIsSearchOpen(false);
  }

  const handleSearchFromBar = (newQuery: string) => {
    setPendingQuery(newQuery);
    const params = new URLSearchParams({ q: newQuery });
    if (city) params.set('city', city);
    startSearchTransition(() => {
      router.push(`/resultados?${params.toString()}`);
    });
  };

  const handleRefineLink = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    startSearchTransition(() => {
      router.push(href);
    });
  };

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
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-5 sm:py-7 animate-fade-in-smooth">
        {/* Encabezado: H1 con la consulta y botón para desplegar el buscador */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h1 className="text-[22px] sm:text-[28px] font-black text-neutral-900 break-words leading-tight">
            Resultados para &ldquo;{query}&rdquo;
          </h1>
          {!isSearchOpen && (
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[13px] sm:text-sm font-bold text-neutral-700 bg-white border border-neutral-200/90 hover:border-primary hover:text-primary shadow-xs transition-all active:scale-95 shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
              <span>Buscar de nuevo</span>
            </button>
          )}
        </div>

        {/* Buscador expandible: Oculto por defecto, se activa al hacer clic en 'Buscar de nuevo' */}
        {isSearchOpen && (
          <div className="mb-4 animate-fade-in-smooth">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">
                Nueva búsqueda
              </span>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="text-[12px] font-semibold text-neutral-500 hover:text-neutral-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cerrar</span>
              </button>
            </div>
            <ResultadosSearchBar
              query={query}
              city={city}
              isSearching={isSearching}
              autoFocus
              onSearch={handleSearchFromBar}
            />
          </div>
        )}

        {/* Banner de Búsqueda Inteligente: Activo con streaming o con resumen previo */}
        {isSearching ? (
          <section
            aria-label="Interpretando búsqueda"
            className="mb-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-primary-bg via-pink-50/40 to-white border border-primary/20 p-3 sm:p-3.5 shadow-xs relative overflow-hidden animate-pulse w-full"
          >
            {/* Barra fluida de progreso superior */}
            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-primary/10 overflow-hidden">
              <div className="h-full w-1/3 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-full animate-indeterminate" />
            </div>
            <div className="flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              <div className="min-w-0 flex-1 flex items-center gap-2">
                <span className="text-[12px] font-bold text-primary shrink-0">
                  Búsqueda inteligente
                </span>
                <span className="text-neutral-300">·</span>
                <p className="text-[13.5px] sm:text-[14px] font-medium text-neutral-800 leading-snug truncate">
                  {activePendingQuery
                    ? `Buscando clases para “${activePendingQuery}”…`
                    : 'Buscando las mejores clases en vivo…'}
                </p>
              </div>
            </div>
          </section>
        ) : (aiSummary || chips.length > 0) ? (
          <section
            aria-label="Cómo interpretamos tu búsqueda"
            className="mb-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-primary/[0.04] via-neutral-50 to-neutral-50 border border-primary/15 p-3 sm:p-3.5 shadow-2xs w-full flex flex-col gap-2"
          >
            {aiSummary && (
              <p className="text-[13px] sm:text-[14px] text-neutral-800 leading-snug">
                <span className="font-bold text-primary mr-1.5">
                  Búsqueda inteligente:
                </span>
                {aiSummary}
              </p>
            )}
            {chips.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[12px] sm:text-[13px] font-bold text-neutral-500 mr-1">
                  Filtros aplicados:
                </span>
                {chips.map(chip => (
                  <Link
                    key={`${chip.kind}-${chip.label}`}
                    href={chipHref(chip)}
                    onClick={e => handleRefineLink(e, chipHref(chip))}
                    scroll={false}
                    aria-label={`Quitar filtro ${chip.label}`}
                    className="group inline-flex items-center gap-1.5 text-[12px] font-semibold bg-white text-neutral-800 pl-2.5 pr-2 py-0.5 rounded-full border border-primary/25 shadow-2xs transition-[background-color,border-color,transform] hover:border-primary hover:text-primary active:scale-95"
                  >
                    <span>{chip.label}</span>
                    <X className="w-3 h-3 text-neutral-400 group-hover:text-primary" aria-hidden="true" />
                  </Link>
                ))}
                {chips.length > 1 && (
                  <Link
                    href={buildRefinementHref(query, city, {}, [])}
                    onClick={e => handleRefineLink(e, buildRefinementHref(query, city, {}, []))}
                    scroll={false}
                    className="text-[12px] font-semibold text-neutral-500 hover:text-primary underline-offset-2 hover:underline px-1.5"
                  >
                    Limpiar todos
                  </Link>
                )}
              </div>
            )}
          </section>
        ) : null}

        {/* Barra unificada: pestañas a la izquierda, contador discreto a la derecha */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex gap-1 bg-neutral-100/90 p-1 rounded-xl w-fit overflow-x-auto border border-neutral-200/50">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                disabled={isSearching}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-[13px] sm:text-sm font-bold whitespace-nowrap transition-all duration-150 active:scale-[0.97] ${
                  tab === t.key
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/50'
                } disabled:opacity-60`}
              >
                {t.label}{' '}
                <span className={`ml-1 text-xs font-semibold ${tab === t.key ? 'text-primary' : 'text-neutral-400'}`}>
                  ({t.count})
                </span>
              </button>
            ))}
          </div>

          <p className="text-[13px] sm:text-[13.5px] text-neutral-500 font-medium select-none">
            {totalResults} resultado{totalResults !== 1 ? 's' : ''} en total
          </p>
        </div>

        {/* Visualización de resultados: Skeletons durante streaming o contenido real */}
        {isSearching ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0 md:gap-5 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <ClassCardSkeleton key={i} mobileLayout="row" />
            ))}
          </div>
        ) : (
          <>
            {tab === 'clases' && (
              classes.length === 0 ? (
                <EmptySection
                  query={query}
                  tab="clases"
                  isOutOfDomain={isOutOfDomain}
                  relaxations={relaxations}
                  suggestedStyles={suggestedStyles}
                  onRefine={handleRefineLink}
                />
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
                <EmptySection query={query} tab="profesores" isOutOfDomain={isOutOfDomain} />
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {profesores.map(p => <ProfileResultCard key={p.id} teacher={p} listName="resultados" />)}
                </div>
              )
            )}

            {tab === 'academias' && (
              academias.length === 0 ? (
                <EmptySection query={query} tab="academias" isOutOfDomain={isOutOfDomain} />
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {academias.map(a => <ProfileResultCard key={a.id} teacher={a} listName="resultados" />)}
                </div>
              )
            )}
          </>
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
