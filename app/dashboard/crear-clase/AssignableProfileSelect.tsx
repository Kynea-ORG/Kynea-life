'use client';
import { useState, useRef, useEffect, useMemo, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, X, Loader2 } from 'lucide-react';
import type { AssignableProfile } from '@/lib/classes/queries';

export interface AssignableProfileSelectProps {
  value: string;
  onChange: (profileId: string, profile?: AssignableProfile) => void;
  profiles: AssignableProfile[];
  /**
   * Hook opcional pensado para búsqueda en servidor en el futuro.
   * Si no se provee, el componente filtra `profiles` localmente en el cliente.
   */
  onSearch?: (query: string) => Promise<AssignableProfile[]>;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function filterAssignableProfiles(
  profiles: AssignableProfile[],
  query: string
): AssignableProfile[] {
  const q = normalizeText(query);
  if (!q) return profiles;
  return profiles.filter(p => {
    const nameMatch = normalizeText(p.name).includes(q);
    const slugMatch = p.slug ? normalizeText(p.slug).includes(q) : false;
    const roleLabel = p.role === 'academia' ? 'academia' : 'profesor';
    const roleMatch = roleLabel.includes(q);
    return nameMatch || slugMatch || roleMatch;
  });
}

function subscribeMobile(callback: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia('(max-width: 767px)');
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getMobileSnapshot() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(max-width: 767px)').matches;
}

function getServerMobileSnapshot() {
  return false;
}

export default function AssignableProfileSelect({
  value,
  onChange,
  profiles,
  onSearch,
  placeholder = 'Seleccionar profesor o academia…',
  error,
  disabled = false,
}: AssignableProfileSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [remoteResults, setRemoteResults] = useState<AssignableProfile[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const isMobile = useSyncExternalStore(
    subscribeMobile,
    getMobileSnapshot,
    getServerMobileSnapshot
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Bloquear scroll en mobile cuando el bottom sheet está abierto
  useEffect(() => {
    if (isOpen && isMobile) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, isMobile]);

  // Cerrar al hacer clic fuera en desktop
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!isMobile && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen && !isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isMobile]);

  // Búsqueda en servidor (futura) con debounce cuando se provee `onSearch`
  useEffect(() => {
    if (!onSearch || !isOpen) return;
    let active = true;
    const timer = setTimeout(async () => {
      if (active) setIsSearching(true);
      try {
        const res = await onSearch(search);
        if (active) {
          setRemoteResults(res);
          setHighlightedIndex(0);
        }
      } finally {
        if (active) setIsSearching(false);
      }
    }, 220);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, onSearch, isOpen]);

  const displayedProfiles = useMemo(() => {
    if (onSearch && remoteResults !== null) return remoteResults;
    return filterAssignableProfiles(profiles, search);
  }, [onSearch, remoteResults, profiles, search]);

  const selectedProfile = useMemo(() => {
    return (
      profiles.find(p => p.id === value) ??
      remoteResults?.find(p => p.id === value) ??
      null
    );
  }, [profiles, remoteResults, value]);

  function scrollIndexIntoView(index: number) {
    itemRefs.current[index]?.scrollIntoView?.({ block: 'nearest' });
  }

  function handleToggle() {
    setIsOpen(prev => {
      if (!prev) {
        setSearch('');
        const idx = displayedProfiles.findIndex(p => p.id === value);
        setHighlightedIndex(idx >= 0 ? idx : 0);
      }
      return !prev;
    });
  }

  useEffect(() => {
    if (isOpen) {
      const idx = displayedProfiles.findIndex(p => p.id === value);
      const initialIdx = idx >= 0 ? idx : 0;
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
        scrollIndexIntoView(initialIdx);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, value, displayedProfiles]);

  function handleSelect(profile: AssignableProfile) {
    onChange(profile.id, profile);
    setIsOpen(false);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setHighlightedIndex(0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape' || e.key === 'Tab') {
      if (e.key === 'Escape') e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (displayedProfiles.length === 0) return;
      setHighlightedIndex(prev => {
        const next = prev < displayedProfiles.length - 1 ? prev + 1 : 0;
        scrollIndexIntoView(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (displayedProfiles.length === 0) return;
      setHighlightedIndex(prev => {
        const next = prev > 0 ? prev - 1 : displayedProfiles.length - 1;
        scrollIndexIntoView(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (displayedProfiles[highlightedIndex]) {
        handleSelect(displayedProfiles[highlightedIndex]);
      }
    }
  }

  function renderRoleBadge(role: 'profesor' | 'academia') {
    const isAcademia = role === 'academia';
    return (
      <span
        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
          isAcademia
            ? 'bg-pink-50 text-pink-600 border-pink-100'
            : 'bg-neutral-100 text-neutral-700 border-neutral-200'
        }`}
      >
        {isAcademia ? 'Academia' : 'Profesor'}
      </span>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Botón Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={e => {
          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
        className={`input bg-white flex items-center justify-between cursor-pointer text-left ${
          error ? 'border-red' : ''
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-neutral-50' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {selectedProfile ? (
            <>
              {renderRoleBadge(selectedProfile.role)}
              <span className="font-semibold text-neutral-900 truncate">
                {selectedProfile.name}
              </span>
              {!selectedProfile.hasWhatsapp && !selectedProfile.hasInstagram && (
                <span className="text-[10px] font-bold bg-red-bg text-red border border-red/20 px-1.5 py-0.5 rounded-full shrink-0">
                  Sin WhatsApp/IG
                </span>
              )}
            </>
          ) : (
            <span className="text-neutral-400 truncate">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200 ml-2 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover en Desktop (>= 768px) */}
      {isOpen && !isMobile && (
        <div
          className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white border border-neutral-200 rounded-2xl shadow-xl overflow-hidden animate-fade-in"
          onKeyDown={handleKeyDown}
        >
          {/* Buscador integrado */}
          <div className="p-2.5 border-b border-neutral-100 bg-neutral-50/70 flex items-center gap-2">
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-primary shrink-0 ml-1 animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-neutral-400 shrink-0 ml-1" />
            )}
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Buscar profesor o academia por nombre…"
              className="w-full bg-transparent text-sm text-neutral-900 placeholder-neutral-400 outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setHighlightedIndex(0);
                  searchInputRef.current?.focus();
                }}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded-full cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Lista de resultados */}
          <div
            role="listbox"
            tabIndex={-1}
            className="max-h-64 overflow-y-auto py-1 overscroll-contain"
          >
            {displayedProfiles.length > 0 ? (
              displayedProfiles.map((p, index) => {
                const isSelected = value === p.id;
                const isHighlighted = highlightedIndex === index;
                const missingContact = !p.hasWhatsapp && !p.hasInstagram;
                return (
                  <button
                    key={p.id}
                    ref={el => {
                      itemRefs.current[index] = el;
                    }}
                    role="option"
                    aria-selected={isSelected}
                    type="button"
                    tabIndex={-1}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelect(p)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-primary-bg text-primary font-semibold'
                        : isHighlighted
                          ? 'bg-neutral-100 text-neutral-900'
                          : 'text-neutral-800 hover:bg-neutral-100 hover:text-neutral-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {renderRoleBadge(p.role)}
                      <span className="font-semibold text-neutral-900 truncate">{p.name}</span>
                      {missingContact && (
                        <span className="text-[10px] font-bold bg-red-bg text-red border border-red/20 px-1.5 py-0.5 rounded-full shrink-0">
                          Sin WhatsApp/IG
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                  </button>
                );
              })
            ) : (
              <div className="py-6 text-center text-sm text-neutral-400">
                {isSearching
                  ? 'Buscando cuentas…'
                  : `No se encontraron cuentas para "${search}"`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal / Bottom Sheet en Mobile (< 768px) */}
      {isOpen && isMobile && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col justify-end md:hidden">
          <div
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs animate-fade-in"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="assignable-profile-modal-title"
            className="relative z-[101] max-h-[85dvh] w-full bg-white rounded-t-[28px] shadow-2xl flex flex-col overflow-hidden animate-sheet-up"
            onKeyDown={handleKeyDown}
          >
            <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mt-3 mb-1 shrink-0" />

            <div className="px-5 py-3 flex items-center justify-between border-b border-neutral-100 shrink-0">
              <div>
                <h3 id="assignable-profile-modal-title" className="text-base font-bold text-neutral-900">
                  Asignar a cuenta registrada
                </h3>
                <p className="text-xs text-neutral-500">
                  {displayedProfiles.length} {displayedProfiles.length === 1 ? 'cuenta disponible' : 'cuentas disponibles'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar modal"
                className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 active:scale-95 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-neutral-100 bg-neutral-50/80 shrink-0">
              <div className="relative flex items-center bg-white border border-neutral-200 rounded-xl px-3 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                {isSearching ? (
                  <Loader2 className="w-4 h-4 text-primary shrink-0 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-neutral-400 shrink-0 mr-2" />
                )}
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Buscar profesor o academia por nombre…"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full bg-transparent text-sm text-neutral-900 placeholder-neutral-400 outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setHighlightedIndex(0);
                      searchInputRef.current?.focus();
                    }}
                    aria-label="Limpiar búsqueda"
                    className="p-1 text-neutral-400 hover:text-neutral-600 rounded-full cursor-pointer ml-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div
              role="listbox"
              tabIndex={-1}
              className="overflow-y-auto px-3 py-2 space-y-1 overscroll-contain flex-1 pb-8"
            >
              {displayedProfiles.length > 0 ? (
                displayedProfiles.map(p => {
                  const isSelected = value === p.id;
                  const missingContact = !p.hasWhatsapp && !p.hasInstagram;
                  return (
                    <button
                      key={p.id}
                      role="option"
                      aria-selected={isSelected}
                      type="button"
                      onClick={() => handleSelect(p)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-primary-bg text-primary font-semibold border border-primary/20'
                          : 'text-neutral-800 hover:bg-neutral-50 active:bg-neutral-100 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {renderRoleBadge(p.role)}
                        <span className="font-semibold text-neutral-900 text-sm truncate">
                          {p.name}
                        </span>
                        {missingContact && (
                          <span className="text-[10px] font-bold bg-red-bg text-red border border-red/20 px-1.5 py-0.5 rounded-full shrink-0">
                            Sin WhatsApp/IG
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white shrink-0 ml-2">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="py-12 text-center text-sm text-neutral-400">
                  {isSearching
                    ? 'Buscando cuentas…'
                    : `No se encontraron cuentas para "${search}"`}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
