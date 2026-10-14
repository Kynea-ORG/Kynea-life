'use client';
import { Search, Loader2, X } from 'lucide-react';
import {
  AI_SUBMIT_LABEL,
  AI_SUBMIT_LOADING_LABEL,
} from '@/lib/search/aiSearchCopy';

// Versión compacta del buscador del hero, que vive en el Header al hacer
// scroll (desktop). Comparte el estado de la Home — mismo texto, mismo envío.
export default function HomeCompactSearch({
  value,
  onChange,
  onSubmit,
  isAiMode = true,
  isLoading = false,
  placeholder = '¿Qué tienes ganas de bailar?',
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isAiMode?: boolean;
  isLoading?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="w-full max-w-[540px]">
      <div
        className={`p-[2px] rounded-full transition-all ${
          isAiMode
            ? 'ai-border-gradient animate-ai-shimmer shadow-xs hover:shadow-[0_0_16px_rgba(138,17,188,0.2)]'
            : 'border border-neutral-200 bg-white'
        }`}
      >
        <form
          role="search"
          onSubmit={e => {
            e.preventDefault();
            if (isLoading || !value.trim()) return;
            onSubmit();
          }}
          className="w-full bg-white rounded-full pl-3.5 pr-1.5 py-1 flex items-center gap-2.5 transition-all"
        >
          <div className="shrink-0 flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-primary shrink-0 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            )}
          </div>

          <input
            type="search"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            aria-label="Buscar clases, profesores o academias"
            maxLength={200}
            className="flex-1 min-w-0 bg-transparent text-[14px] text-neutral-900 placeholder:text-neutral-400 outline-none truncate [&::-webkit-search-cancel-button]:hidden"
          />

          {value.length > 0 && !isLoading && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => onChange('')}
              aria-label="Limpiar búsqueda"
              className="text-neutral-400 hover:text-neutral-600 p-1 rounded-full transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading || !value.trim()}
            aria-label="Buscar"
            className="shrink-0 font-bold text-[13px] px-4 py-1.5 rounded-full text-white bg-primary hover:bg-primary-dark disabled:opacity-40 transition-all active:scale-95 shadow-xs flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? AI_SUBMIT_LOADING_LABEL : AI_SUBMIT_LABEL}
          </button>
        </form>
      </div>
    </div>
  );
}
