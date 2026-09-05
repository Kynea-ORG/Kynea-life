'use client';
import { useState, useRef, useEffect, useMemo, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import {
  COUNTRIES,
  normalizeSearchText,
  type Country,
} from '@/lib/countries';

interface PhoneCountrySelectProps {
  value: string; // Ej: "+51"
  onChange: (dialCode: string) => void;
  disabled?: boolean;
  className?: string;
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

export default function PhoneCountrySelect({
  value,
  onChange,
  disabled = false,
  className = '',
}: PhoneCountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const isMobile = useSyncExternalStore(
    subscribeMobile,
    getMobileSnapshot,
    getServerMobileSnapshot
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Bloquear scroll de la página en mobile cuando el modal esté abierto
  useEffect(() => {
    if (isOpen && isMobile) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, isMobile]);

  // Cerrar al hacer clic fuera (solo desktop; en mobile el backdrop maneja el cierre)
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

  function scrollIndexIntoView(index: number) {
    itemRefs.current[index]?.scrollIntoView?.({ block: 'nearest' });
  }

  // País seleccionado actual (busca por dialCode)
  const currentCountry = useMemo(() => {
    // Si es +1, preferir Estados Unidos si no se especifica
    if (value === '+1') return COUNTRIES.find(c => c.code === 'US');
    return COUNTRIES.find(c => c.dialCode === value) || COUNTRIES.find(c => c.code === 'PE');
  }, [value]);

  // Filtrar países según búsqueda (nombre, código o dialCode)
  const filteredCountries = useMemo(() => {
    const query = normalizeSearchText(search).replace('+', '');
    if (!query) return COUNTRIES;

    return COUNTRIES.filter(c => {
      const nameMatch = normalizeSearchText(c.name).includes(query);
      const codeMatch = c.code.toLowerCase().includes(query);
      const dialMatch = c.dialCode.replace('+', '').includes(query);
      return nameMatch || codeMatch || dialMatch;
    });
  }, [search]);

  function handleToggle() {
    setIsOpen(prev => {
      if (!prev) {
        setSearch('');
        const idx = COUNTRIES.findIndex(c => c.dialCode === value);
        setHighlightedIndex(idx >= 0 ? idx : 0);
      }
      return !prev;
    });
  }

  // Enfocar input de búsqueda y scrollear al ítem seleccionado al abrir
  useEffect(() => {
    if (isOpen) {
      const idx = COUNTRIES.findIndex(c => c.dialCode === value);
      const initialIdx = idx >= 0 ? idx : 0;
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
        scrollIndexIntoView(initialIdx);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, value]);

  function handleSelect(country: Country) {
    onChange(country.dialCode);
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
      if (filteredCountries.length === 0) return;
      setHighlightedIndex(prev => {
        const next = prev < filteredCountries.length - 1 ? prev + 1 : 0;
        scrollIndexIntoView(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredCountries.length === 0) return;
      setHighlightedIndex(prev => {
        const next = prev > 0 ? prev - 1 : filteredCountries.length - 1;
        scrollIndexIntoView(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCountries[highlightedIndex]) {
        handleSelect(filteredCountries[highlightedIndex]);
      }
    }
  }

  return (
    <div className={`relative shrink-0 ${className}`} ref={containerRef}>
      {/* Botón trigger compacto */}
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
        className={`border-2 border-neutral-200 hover:border-neutral-300 focus:border-primary rounded-btn px-3 py-3 text-sm text-neutral-800 outline-none bg-white flex items-center gap-1.5 cursor-pointer transition-colors h-full ${
          disabled ? 'opacity-60 cursor-not-allowed bg-neutral-50' : ''
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="text-base leading-none">{currentCountry?.flag ?? '🇵🇪'}</span>
        <span className="font-medium text-neutral-800 text-[13px]">{value || '+51'}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover en Desktop (>= 768px) */}
      {isOpen && !isMobile && (
        <div
          className="absolute z-50 left-0 top-full mt-1.5 w-72 bg-white border border-neutral-200 rounded-2xl shadow-xl overflow-hidden animate-fade-in"
          onKeyDown={handleKeyDown}
        >
          {/* Búsqueda */}
          <div className="p-2 border-b border-neutral-100 bg-neutral-50/70 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Buscar país o prefijo (+51)..."
              className="w-full bg-transparent text-xs text-neutral-900 placeholder-neutral-400 outline-none"
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
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Lista de países */}
          <div
            role="listbox"
            tabIndex={-1}
            className="max-h-60 overflow-y-auto py-1 overscroll-contain"
          >
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country, index) => {
                const isSelected = value === country.dialCode;
                const isHighlighted = highlightedIndex === index;
                return (
                  <button
                    key={country.code}
                    ref={el => {
                      itemRefs.current[index] = el;
                    }}
                    role="option"
                    aria-selected={isSelected}
                    type="button"
                    tabIndex={-1}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelect(country)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors cursor-pointer rounded-lg ${
                      isSelected
                        ? 'bg-primary-bg text-primary font-semibold'
                        : isHighlighted
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'text-neutral-800 hover:bg-neutral-100 hover:text-neutral-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base leading-none shrink-0">{country.flag}</span>
                      <span className="truncate">{country.name}</span>
                    </div>
                    <span className="font-mono text-neutral-500 text-[11px] shrink-0 ml-2">
                      {country.dialCode}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="py-5 text-center text-xs text-neutral-400">
                No se encontraron países
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal / Bottom Sheet en Mobile (< 768px) renderizado vía Portal */}
      {isOpen && isMobile && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col justify-end md:hidden">
          {/* Backdrop con desenfoque suave */}
          <div
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs animate-fade-in"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Bottom Sheet Container */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="phone-country-modal-title"
            className="relative z-[101] max-h-[88dvh] w-full bg-white rounded-t-[28px] shadow-2xl flex flex-col overflow-hidden animate-sheet-up"
            onKeyDown={handleKeyDown}
          >
            {/* Indicador de arrastre (Handle) */}
            <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mt-3 mb-1 shrink-0" />

            {/* Header del Modal */}
            <div className="px-5 py-3 flex items-center justify-between border-b border-neutral-100 shrink-0">
              <div>
                <h3 id="phone-country-modal-title" className="text-base font-bold text-neutral-900">
                  Código de país
                </h3>
                <p className="text-xs text-neutral-500">
                  Selecciona el prefijo para tu WhatsApp
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

            {/* Buscador Sticky */}
            <div className="p-3 border-b border-neutral-100 bg-neutral-50/80 shrink-0">
              <div className="relative flex items-center bg-white border border-neutral-200 rounded-xl px-3 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <Search className="w-4 h-4 text-neutral-400 shrink-0 mr-2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Buscar país o prefijo (+51)..."
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

            {/* Lista táctil con safe-area padding */}
            <div
              role="listbox"
              tabIndex={-1}
              className="flex-1 overflow-y-auto overscroll-contain px-3 py-2 pb-8 divide-y divide-neutral-50"
            >
              {filteredCountries.length > 0 ? (
                filteredCountries.map((country, index) => {
                  const isSelected = value === country.dialCode;
                  const isHighlighted = highlightedIndex === index;
                  return (
                    <button
                      key={country.code}
                      ref={el => {
                        itemRefs.current[index] = el;
                      }}
                      role="option"
                      aria-selected={isSelected}
                      type="button"
                      tabIndex={-1}
                      onClick={() => handleSelect(country)}
                      className={`w-full flex items-center justify-between px-3.5 py-3.5 text-left transition-colors cursor-pointer rounded-xl min-h-[48px] active:bg-neutral-100 ${
                        isSelected
                          ? 'bg-primary-bg text-primary font-semibold'
                          : isHighlighted
                          ? 'bg-neutral-100 text-neutral-900'
                          : 'text-neutral-800 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl leading-none shrink-0">{country.flag}</span>
                        <span className="text-base truncate font-normal">{country.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="font-mono text-xs font-semibold text-neutral-600 bg-neutral-100 px-2 py-1 rounded-md">
                          {country.dialCode}
                        </span>
                        {isSelected && <Check className="w-5 h-5 text-primary shrink-0" />}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-12 text-center text-sm text-neutral-400">
                  No se encontraron países
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
