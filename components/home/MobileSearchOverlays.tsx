'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, ArrowLeft, Loader2, X, Sparkles } from 'lucide-react';
import SmartImage from '@/components/SmartImage';
import { createClient } from '@/lib/supabase/client';
import { getTypeLabel } from '@/lib/utils';
import type { DbDanceStyle } from '@/lib/types';
import type { SearchClass, SearchProfile } from '@/app/HomeClient';
import { getMainStyle } from '@/app/HomeClient';
import {
  AI_PLACEHOLDER_EXAMPLES, AI_QUICK_PROMPTS, AI_QUICK_PROMPTS_TITLE,
  AI_SUBMIT_LABEL, AI_SUBMIT_LOADING_LABEL,
} from '@/lib/search/aiSearchCopy';


export interface MobileStyleSearchOverlayProps {
  isOpen: boolean;
  shouldRender: boolean;
  initialQuery: string;
  isAiMode: boolean;
  /** Sugerencias salidas del catálogo real; si falta, se usan los textos base. */
  quickPrompts?: string[];
  toggleAiMode: () => void;
  isLoading: boolean;
  danceStylesWithClasses: DbDanceStyle[];
  onClose: (finalQuery: string) => void;
  onSearch: (finalQuery: string) => void;
  pickStyle: (name: string) => void;
  goToClass: (cls: SearchClass) => void;
  goToProfile: (p: SearchProfile) => void;
  rotatingPlaceholder: string;
}

export function MobileStyleSearchOverlay({
  isOpen,
  shouldRender,
  initialQuery,
  isAiMode,
  toggleAiMode,
  quickPrompts = AI_QUICK_PROMPTS,
  isLoading,
  danceStylesWithClasses,
  onClose,
  onSearch,
  pickStyle,
  goToClass,
  goToProfile,
  rotatingPlaceholder,
}: MobileStyleSearchOverlayProps) {
  // Estado local aislado: escribir aquí NO re-renderiza HomeClient ni las 50+ tarjetas
  const [localQuery, setLocalQuery] = useState(initialQuery);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<{ classes: SearchClass[]; profiles: SearchProfile[] }>({ classes: [], profiles: [] });
  const [isSearching, setIsSearching] = useState(false);

  // Autocompletado clásico contra la base de datos (solo en modo clásico)
  useEffect(() => {
    if (isAiMode) return;
    const q = localQuery.trim();
    if (q.length < 2) return;

    let active = true;
    const safeQ = q.replace(/[,()%_\\]/g, ' ').replace(/\s+/g, ' ').trim();
    if (safeQ.length < 2) return;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const supabase = createClient();
        const [{ data: classes }, { data: profiles }] = await Promise.all([
          supabase
            .from('classes')
            .select('id, slug, title, type, class_styles(is_main, dance_styles(name, slug))')
            .eq('status', 'published')
            .or('end_date.is.null,end_date.gte.today')
            .ilike('title', `%${safeQ}%`)
            .limit(4),
          supabase
            .from('profiles')
            .select('id, slug, name, role, photo_url')
            .in('role', ['profesor', 'academia'])
            .ilike('name', `%${safeQ}%`)
            .limit(3),
        ]);
        if (active) {
          setSuggestions({
            classes: (classes as unknown as SearchClass[]) ?? [],
            profiles: profiles ?? [],
          });
        }
      } catch {
        if (active) setSuggestions({ classes: [], profiles: [] });
      } finally {
        if (active) setIsSearching(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [localQuery, isAiMode]);

  const matchingStyles = useMemo(() => {
    const q = localQuery.trim().toLowerCase();
    return q.length > 0
      ? danceStylesWithClasses.filter(s => s.name.toLowerCase().includes(q)).slice(0, 4)
      : danceStylesWithClasses.slice(0, 4);
  }, [localQuery, danceStylesWithClasses]);

  const activeSuggestions = !isAiMode && localQuery.trim().length >= 2
    ? suggestions
    : { classes: [] as SearchClass[], profiles: [] as SearchProfile[] };

  if (!shouldRender) return null;

  return (
    <div
      className={`md:hidden fixed inset-0 z-[60] bg-white flex flex-col isolate transform-gpu transition-transform duration-200 ease-out starting:translate-y-full ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-100 shrink-0">
        <button type="button" onClick={() => onClose(localQuery)} aria-label="Volver">
          <ArrowLeft className="w-5 h-5 text-neutral-900" />
        </button>
        <div className="flex-1 flex items-center gap-2.5 bg-neutral-50 border-2 border-primary rounded-xl px-3.5 py-2.5">
          {isAiMode ? (
            <Sparkles className="w-[17px] h-[17px] text-primary shrink-0" />
          ) : (
            <Search className="w-[17px] h-[17px] text-primary shrink-0" />
          )}
          <input
            autoFocus
            type="text"
            placeholder={isInputFocused ? '' : (isAiMode ? AI_PLACEHOLDER_EXAMPLES[0] : (rotatingPlaceholder || '¿Qué quieres bailar?'))}
            value={localQuery}
            onChange={e => setLocalQuery(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSearch(localQuery);
              }
            }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="search"
            className="flex-1 min-w-0 min-h-[22px] text-[16px] leading-[22px] text-neutral-900 placeholder:text-neutral-700 outline-none bg-transparent"
          />
          {localQuery.length > 0 && (
            <button
              type="button"
              onClick={() => setLocalQuery('')}
              aria-label="Limpiar búsqueda"
              className="text-neutral-400 hover:text-neutral-600 p-1 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Switch Modo IA en Overlay Mobile */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-50 border-b border-neutral-100 shrink-0">
        <span className="text-xs font-semibold text-neutral-600 flex items-center gap-1.5">
          <Sparkles className={`w-3.5 h-3.5 ${isAiMode ? 'text-primary' : 'text-neutral-400'}`} />
          {isAiMode ? 'Búsqueda inteligente con IA' : 'Búsqueda clásica'}
        </span>
        <button
          type="button"
          onClick={toggleAiMode}
          className={`text-xs font-bold underline ${isAiMode ? 'text-neutral-500' : 'text-primary'}`}
        >
          {isAiMode ? 'Modo clásico' : 'Activar IA'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {/* Sugerencias de búsqueda rápida cuando el input está vacío */}
        {isAiMode && quickPrompts.length > 0 && localQuery.trim().length === 0 && (
          <div className="px-5 pt-4 pb-2">
            <p className="pb-2 text-[11px] font-extrabold tracking-widest uppercase text-neutral-400">
              {AI_QUICK_PROMPTS_TITLE}
            </p>
            <div className="flex flex-col gap-2">
              {quickPrompts.map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  disabled={isLoading}
                  onClick={() => onSearch(prompt)}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-50 hover:bg-primary/5 active:bg-primary/10 text-left border border-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                  <Sparkles className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-[14px] text-neutral-800 font-medium">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Botón directo para buscar con IA al escribir texto */}
        {isAiMode && localQuery.trim().length > 0 && (
          <div className="px-5 pt-4">
            <button
              type="button"
              onClick={() => onSearch(localQuery)}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold text-[15px] shadow-md shadow-primary/25 cursor-pointer active:scale-[0.98] transition-all disabled:opacity-75 disabled:cursor-wait"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 shrink-0" />
              )}
              <span>{isLoading ? AI_SUBMIT_LOADING_LABEL : AI_SUBMIT_LABEL}</span>
            </button>
          </div>
        )}

        {/* Modo clásico: Estilos coincidentes */}
        {!isAiMode && matchingStyles.length > 0 && (
          <div className="pt-4">
            <p className="px-5 pb-1.5 text-[11px] font-extrabold tracking-widest uppercase text-neutral-400">Estilos</p>
            {matchingStyles.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => pickStyle(s.name)}
                className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-neutral-50 transition-colors text-left"
              >
                <div className="w-[34px] h-[34px] rounded-[10px] bg-primary-bg flex items-center justify-center shrink-0">
                  <Search className="w-[17px] h-[17px] text-primary" />
                </div>
                <span className="text-[14.5px] text-neutral-900">{s.name}</span>
              </button>
            ))}
          </div>
        )}

        {!isAiMode && isSearching && (
          <div className="flex items-center gap-2 px-5 py-4 text-[13px] text-neutral-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando…
          </div>
        )}

        {!isAiMode && !isSearching && activeSuggestions.classes.length === 0 && activeSuggestions.profiles.length === 0 && matchingStyles.length === 0 && localQuery.trim().length >= 2 && (
          <p className="px-5 py-4 text-[13px] text-neutral-400">Sin resultados para &ldquo;{localQuery}&rdquo;</p>
        )}

        {/* Modo clásico: Clases sugeridas */}
        {!isAiMode && activeSuggestions.classes.length > 0 && (
          <div className="pt-4">
            <p className="px-5 pb-1.5 text-[11px] font-extrabold tracking-widest uppercase text-neutral-400">Clases</p>
            {activeSuggestions.classes.map(cls => {
              const mainStyle = getMainStyle(cls);
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => goToClass(cls)}
                  className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-neutral-50 transition-colors text-left"
                >
                  <div className="w-[34px] h-[34px] rounded-[10px] bg-primary-bg flex items-center justify-center shrink-0 text-sm">💃</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-semibold text-neutral-900 truncate">{cls.title}</p>
                    <p className="text-[11.5px] text-neutral-400">{mainStyle?.name ? `${mainStyle.name} · ` : ''}{getTypeLabel(cls.type)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Modo clásico: Profesores sugeridos */}
        {!isAiMode && activeSuggestions.profiles.length > 0 && (
          <div className="pt-4">
            <p className="px-5 pb-1.5 text-[11px] font-extrabold tracking-widest uppercase text-neutral-400">Profesores</p>
            {activeSuggestions.profiles.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => goToProfile(p)}
                className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-neutral-50 transition-colors text-left"
              >
                {p.photo_url ? (
                  <div className="relative w-[34px] h-[34px] rounded-full overflow-hidden shrink-0">
                    <SmartImage src={p.photo_url} alt={p.name} fill sizes="34px" className="object-cover" />
                  </div>
                ) : (
                  <div className="w-[34px] h-[34px] rounded-full bg-neutral-200 flex items-center justify-center text-[13px] font-bold text-neutral-600 shrink-0">
                    {p.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-neutral-900 truncate">{p.name}</p>
                  <p className="text-[11.5px] text-neutral-400 capitalize">{p.role}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {!isAiMode && !isSearching && localQuery.trim().length >= 2 && (
          <div className="px-5 pt-4">
            <button
              type="button"
              onClick={() => onSearch(localQuery)}
              className="text-[13.5px] font-bold text-primary disabled:opacity-60 flex items-center gap-1.5"
            >
              Ver todos los resultados para &ldquo;{localQuery}&rdquo; →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function MobileCitySearchOverlay({
  isOpen,
  shouldRender,
  initialCity,
  cityNames,
  onClose,
  onPickCity,
}: {
  isOpen: boolean;
  shouldRender: boolean;
  initialCity: string;
  cityNames: string[];
  onClose: (finalCity: string) => void;
  onPickCity: (city: string) => void;
}) {
  const [localCity, setLocalCity] = useState(initialCity);

  const filtered = useMemo(() => {
    const c = localCity.trim().toLowerCase();
    return cityNames.filter(name => name.toLowerCase().includes(c)).slice(0, 8);
  }, [localCity, cityNames]);

  if (!shouldRender) return null;

  return (
    <div
      className={`md:hidden fixed inset-0 z-[60] bg-white flex flex-col isolate transform-gpu transition-transform duration-200 ease-out starting:translate-y-full ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-100 shrink-0">
        <button type="button" onClick={() => onClose(localCity)} aria-label="Volver">
          <ArrowLeft className="w-5 h-5 text-neutral-900" />
        </button>
        <div className="flex-1 flex items-center gap-2.5 bg-neutral-50 border-2 border-primary rounded-xl px-3.5 py-2.5">
          <MapPin className="w-[17px] h-[17px] text-primary shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Busca tu ciudad…"
            value={localCity}
            onChange={e => setLocalCity(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="search"
            className="flex-1 min-w-0 text-[16px] text-neutral-900 outline-none bg-transparent"
          />
          {localCity.length > 0 && (
            <button
              type="button"
              onClick={() => setLocalCity('')}
              aria-label="Limpiar ciudad"
              className="text-neutral-400 hover:text-neutral-600 p-1 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pt-2 pb-8">
        <p className="px-5 pt-3 pb-1.5 text-[11px] font-extrabold tracking-widest uppercase text-neutral-400">Ciudades</p>
        {filtered.length === 0 ? (
          <p className="px-5 py-3 text-[14px] text-neutral-400">Sin resultados para &ldquo;{localCity}&rdquo;</p>
        ) : (
          filtered.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => onPickCity(c)}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 transition-colors text-left"
            >
              <div className="w-[34px] h-[34px] rounded-[10px] bg-primary-bg flex items-center justify-center shrink-0">
                <MapPin className="w-[17px] h-[17px] text-primary" />
              </div>
              <span className="text-[14.5px] text-neutral-900">{c}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
