'use client';
import { Search, Sparkles, Loader2 } from 'lucide-react';

// Versión compacta del buscador del hero, que vive en el Header al hacer
// scroll (desktop). Comparte el estado de la Home — mismo texto, mismo envío.
export default function HomeCompactSearch({
  value, onChange, onSubmit, isAiMode, isLoading, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isAiMode: boolean;
  isLoading: boolean;
  placeholder: string;
}) {
  return (
    <form
      role="search"
      onSubmit={e => {
        e.preventDefault();
        if (isLoading || !value.trim()) return;
        onSubmit();
      }}
      className={`flex items-center gap-2.5 w-full max-w-[560px] rounded-full border bg-white pl-4 pr-1.5 py-1.5 transition-[border-color,box-shadow] focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10 ${
        isAiMode ? 'border-primary/30' : 'border-neutral-200'
      }`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 text-primary shrink-0 animate-spin" aria-hidden="true" />
      ) : isAiMode ? (
        <Sparkles className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
      ) : (
        <Search className="w-4 h-4 text-neutral-400 shrink-0" aria-hidden="true" />
      )}
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Buscar clases, profesores o academias"
        maxLength={200}
        className="flex-1 min-w-0 bg-transparent text-[14px] text-neutral-900 placeholder:text-neutral-500 outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      <button
        type="submit"
        disabled={isLoading || !value.trim()}
        aria-label="Buscar"
        className="shrink-0 w-8 h-8 rounded-full bg-primary hover:bg-primary-dark disabled:opacity-40 text-white flex items-center justify-center transition-[background-color,transform] active:scale-95"
      >
        <Search className="w-4 h-4" aria-hidden="true" />
      </button>
    </form>
  );
}
