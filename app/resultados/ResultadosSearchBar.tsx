'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { AI_SEARCH_LABEL, AI_SUBMIT_LABEL } from '@/lib/search/aiSearchCopy';

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
    <div className="w-full mb-8">
      <div className="p-[2.5px] rounded-[22px] ai-border-gradient animate-ai-shimmer shadow-xs">
        <form onSubmit={submit} role="search" className="w-full bg-white rounded-[19.5px] p-2 flex items-center gap-3">
          <div className="pl-3.5 shrink-0">
            <Search className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0 py-0.5 text-left">
            <p className="text-[11px] leading-[14px] font-bold text-primary select-none">
              {AI_SEARCH_LABEL}
            </p>
            <input
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              maxLength={200}
              placeholder="Cuéntanos qué tienes ganas de bailar…"
              aria-label="Buscar clases, profesores o academias"
              className="w-full bg-transparent text-[15px] sm:text-[16px] text-neutral-900 placeholder:text-neutral-400 outline-none mt-0.5 truncate"
            />
          </div>
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => setValue('')}
              aria-label="Limpiar búsqueda"
              className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-full transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={!value.trim()}
            className="shrink-0 font-bold text-[14px] px-6 py-2.5 rounded-xl text-white bg-primary hover:bg-primary-dark disabled:opacity-40 transition-all active:scale-95 shadow-xs"
          >
            {AI_SUBMIT_LABEL}
          </button>
        </form>
      </div>
    </div>
  );
}
