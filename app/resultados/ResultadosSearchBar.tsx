'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight } from 'lucide-react';

// Nueva búsqueda desde la propia página de resultados: es una consulta nueva
// (sin r=1), así que la IA vuelve a interpretarla desde cero.
export default function ResultadosSearchBar({ query, city }: { query: string; city?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(query);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    const params = new URLSearchParams({ q });
    if (city) params.set('city', city);
    router.push(`/resultados?${params.toString()}`);
  };

  return (
    <form onSubmit={submit} role="search" className="mb-6">
      <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white pl-4 pr-2 py-2 shadow-2xs focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-[border-color,box-shadow]">
        <Sparkles className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          maxLength={200}
          placeholder="Cuéntanos qué buscas…"
          aria-label="Buscar clases, profesores o academias"
          className="flex-1 min-w-0 bg-transparent text-[15px] text-neutral-900 placeholder:text-neutral-400 outline-none py-1.5"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="shrink-0 inline-flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white text-[13px] font-bold px-4 py-2 rounded-xl transition-[background-color,transform] active:scale-95"
        >
          <span>Buscar</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
