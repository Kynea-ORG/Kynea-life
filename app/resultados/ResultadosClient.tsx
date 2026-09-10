'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ClassCard from '@/components/ClassCard';
import SmartImage from '@/components/SmartImage';
import TrackedProfileLink from '@/components/TrackedProfileLink';
import { recordRecentSearch } from '@/lib/recentSearches';
import { trackRecentSearchAdded } from '@/lib/analytics';
import type { DanceClass, Teacher } from '@/lib/types';

type Tab = 'clases' | 'profesores' | 'academias';

function EmptySection({ label }: { label: string }) {
  return (
    <div className="text-center py-20 text-neutral-400">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4">
        <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <p className="text-[15px]">{label}</p>
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
}: {
  query: string;
  classes: DanceClass[];
  profesores: Teacher[];
  academias: Teacher[];
}) {
  // La primera pestaña con resultados, no siempre "Clases" — buscar "Zeus"
  // (0 clases, 1 profesor) no debería aterrizar en una pestaña vacía.
  const defaultTab: Tab = classes.length > 0 ? 'clases' : profesores.length > 0 ? 'profesores' : 'academias';
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

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <h1 className="text-[26px] sm:text-[32px] font-black text-neutral-900 mb-1 break-words">
          Resultados para &ldquo;{query}&rdquo;
        </h1>
        <p className="text-neutral-600 mb-8">
          {totalResults} resultado{totalResults !== 1 ? 's' : ''} en total
        </p>

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
            <EmptySection label={`No encontramos clases para "${query}".`} />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {classes.map(cls => <ClassCard key={cls.id} cls={cls} listName="resultados" />)}
            </div>
          )
        )}

        {tab === 'profesores' && (
          profesores.length === 0 ? (
            <EmptySection label={`No encontramos profesores para "${query}".`} />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {profesores.map(p => <ProfileResultCard key={p.id} teacher={p} listName="resultados" />)}
            </div>
          )
        )}

        {tab === 'academias' && (
          academias.length === 0 ? (
            <EmptySection label={`No encontramos academias para "${query}".`} />
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
      </div>
      <Footer />
    </div>
  );
}
