'use client';
import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, X } from 'lucide-react';
import { AI_SEARCH_LABEL, AI_SUBMIT_LABEL, AI_SUBMIT_LOADING_LABEL } from '@/lib/search/aiSearchCopy';

interface ResultadosSearchBarProps {
  query?: string;
  city?: string;
  isSearching?: boolean;
  autoFocus?: boolean;
  onSearch?: (newQuery: string) => void;
}

// Nueva búsqueda desde la propia página de resultados: es una consulta nueva
// (sin r=1), así que la IA vuelve a interpretarla desde cero.
export default function ResultadosSearchBar({
  city,
  isSearching: externalSearching,
  autoFocus,
  onSearch,
}: ResultadosSearchBarProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalSearching, startTransition] = useTransition();
  const [value, setValue] = useState('');

  const isSearching = externalSearching ?? internalSearching;

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q || isSearching) return;

    if (onSearch) {
      onSearch(q);
      return;
    }

    const params = new URLSearchParams({ q });
    if (city) params.set('city', city);
    startTransition(() => {
      router.push(`/resultados?${params.toString()}`);
    });
  };

  return (
    <div className="w-full mb-3 sm:mb-4">
      {/* Borde iridiscente con trazo uniforme de 2px exactos en los 4 lados (26px exterior / 24px interior) */}
      <div className="relative p-[2px] rounded-[26px] ai-border-gradient animate-ai-shimmer shadow-xs focus-within:shadow-[0_4px_24px_rgba(217,70,239,0.18)] transition-shadow">
        <form
          onSubmit={submit}
          role="search"
          className="w-full bg-white rounded-[24px] p-2 flex items-center gap-2.5 sm:gap-3 transition-all min-h-[58px] sm:min-h-[64px]"
        >
          {/* Ícono de búsqueda */}
          <div className="pl-3.5 shrink-0">
            <Search className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
          </div>

          {/* Bloque central de texto con altura y espaciado proporcional */}
          <div className="flex-1 min-w-0 text-left py-0.5 sm:py-1">
            <p className="text-[11.5px] leading-[15px] font-bold text-primary select-none truncate">
              {AI_SEARCH_LABEL}
            </p>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              disabled={isSearching}
              maxLength={200}
              placeholder="Cuéntanos qué tienes ganas de bailar…"
              aria-label="Buscar clases, profesores o academias"
              className="w-full text-[15px] sm:text-[16px] leading-[22px] font-normal text-neutral-900 placeholder:text-neutral-400 outline-none bg-transparent mt-0.5 truncate disabled:cursor-wait"
            />
          </div>

          {/* Botón de limpiar consulta */}
          {value.length > 0 && !isSearching && (
            <button
              type="button"
              onClick={() => setValue('')}
              aria-label="Limpiar búsqueda"
              className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-full transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Botón de acción con spinner y copia en gerundio durante carga */}
          <button
            type="submit"
            disabled={!value.trim() || isSearching}
            className="shrink-0 font-black text-[14px] sm:text-[15px] px-5 sm:px-8 py-3 sm:py-3.5 rounded-2xl cursor-pointer transition-all active:scale-[0.98] disabled:opacity-75 disabled:cursor-wait text-white bg-primary hover:bg-primary-dark shadow-xs inline-flex items-center gap-2"
          >
            {isSearching && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
            <span>{isSearching ? AI_SUBMIT_LOADING_LABEL : AI_SUBMIT_LABEL}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
