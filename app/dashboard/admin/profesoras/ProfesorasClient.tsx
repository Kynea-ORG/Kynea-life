'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import SmartImage from '@/components/SmartImage';
import { setProfileIsWoman } from '@/lib/admin/actions';
import type { AdminProfesor } from '@/lib/admin/queries';

// Etiquetado de profesoras (migración 63): alimenta "Clases con profesoras" del Home
// y /clases?profesoras=1. Solo lo hace el equipo de Kynea; el dato no lo declara el usuario.
export default function ProfesorasClient({
  profesores,
  total,
  page,
  totalPages,
  search,
  migrationPending = false,
}: {
  profesores: AdminProfesor[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  migrationPending?: boolean;
}) {
  const [flags, setFlags] = useState<Record<string, boolean>>(
    () => Object.fromEntries(profesores.map(p => [p.id, p.isWoman])),
  );
  const [error, setError] = useState<string | null>(null);

  const taggedHere = profesores.filter(p => flags[p.id]).length;

  const toggle = async (p: AdminProfesor) => {
    const next = !flags[p.id];
    setError(null);
    setFlags(f => ({ ...f, [p.id]: next }));
    try {
      const res = await setProfileIsWoman(p.id, next);
      if (!res.ok) {
        setFlags(f => ({ ...f, [p.id]: !next }));
        setError(res.error);
      }
    } catch (err) {
      setFlags(f => ({ ...f, [p.id]: !next }));
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  };

  const pageHref = (n: number) =>
    `/dashboard/admin/profesoras?${new URLSearchParams({ ...(search ? { q: search } : {}), page: String(n) })}`;

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-neutral-900">Profesoras</h1>
        <p className="text-neutral-600 text-sm mt-1">
          Marca a las profesoras de Kynea. Sus clases aparecen en la sección «Clases con profesoras» del Home y en
          <span className="font-semibold"> /clases?profesoras=1</span>. {taggedHere > 0 && `${taggedHere} profesora${taggedHere !== 1 ? 's' : ''} etiquetada${taggedHere !== 1 ? 's' : ''} en esta página.`}
        </p>
      </div>

      {migrationPending && (
        <p className="text-sm text-amber-text bg-amber-bg border border-amber rounded-xl px-4 py-3 mb-4">
          Falta aplicar la migración 63 (<code>profiles.is_woman</code>) en esta base de datos antes de poder etiquetar.
        </p>
      )}

      <form action="/dashboard/admin/profesoras" method="get" role="search" className="mb-4">
        <div className="flex items-center gap-2 border border-neutral-200 rounded-xl px-3 py-2 bg-white focus-within:border-neutral-900 transition-colors">
          <Search className="w-4 h-4 text-neutral-400 shrink-0" aria-hidden="true" />
          <input
            name="q"
            defaultValue={search}
            placeholder="Buscar profesor por nombre…"
            aria-label="Buscar profesor por nombre"
            className="flex-1 min-w-0 text-sm outline-none bg-transparent"
          />
          <button type="submit" className="text-xs font-bold bg-neutral-900 text-white rounded-lg px-3 py-1.5">Buscar</button>
        </div>
      </form>

      {error && <p role="alert" className="text-sm text-red bg-red-bg border border-red rounded-xl px-4 py-2.5 mb-3">{error}</p>}

      {profesores.length === 0 && !migrationPending ? (
        <p className="text-sm text-neutral-600 py-10 text-center">No encontramos profesores{search ? ` para «${search}»` : ''}.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl bg-white overflow-hidden">
          {profesores.map(p => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-100 shrink-0">
                {p.photoUrl && <SmartImage src={p.photoUrl} alt="" fill sizes="40px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-900 truncate">{p.name ?? 'Sin nombre'}</p>
                {p.slug && (
                  <Link href={`/profesores/${p.slug}`} target="_blank" className="text-xs text-neutral-500 hover:underline">
                    Ver perfil
                  </Link>
                )}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={flags[p.id]}
                aria-label={`${p.name ?? 'Profesor'} es profesora`}
                onClick={() => toggle(p)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                  flags[p.id] ? 'bg-primary' : 'bg-neutral-300'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${flags[p.id] ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          {page > 1 ? <Link href={pageHref(page - 1)} className="font-semibold text-neutral-900">← Anterior</Link> : <span />}
          <span className="text-neutral-500">Página {page} de {totalPages} · {total} profesores</span>
          {page < totalPages ? <Link href={pageHref(page + 1)} className="font-semibold text-neutral-900">Siguiente →</Link> : <span />}
        </div>
      )}
    </div>
  );
}
