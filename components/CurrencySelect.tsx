'use client';
import { useState, useRef, useEffect, useMemo, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import {
  findCurrencyByCode,
  filterCurrencies,
} from '@/lib/currencies';

interface CurrencySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
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

export default function CurrencySelect({
  value,
  onChange,
  placeholder = 'Seleccionar moneda…',
  className = '',
  error,
  disabled = false,
  id,
}: CurrencySelectProps) {
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

  function scrollIndexIntoView(index: number) {
    itemRefs.current[index]?.scrollIntoView?.({ block: 'nearest' });
  }

  // Filtrar monedas según el término de búsqueda
  const filteredCurrencies = useMemo(() => {
    return filterCurrencies(search);
  }, [search]);

  const selectedCurrency = useMemo(() => {
    return findCurrencyByCode(value);
  }, [value]);

  function handleToggle() {
    setIsOpen(prev => {
      if (!prev) {
        setSearch('');
        const idx = filteredCurrencies.findIndex(c => c.code === value);
        setHighlightedIndex(idx >= 0 ? idx : 0);
      }
      return !prev;
    });
  }

  // Enfocar input de búsqueda y scrollear al ítem seleccionado al abrir
  useEffect(() => {
    if (isOpen) {
      const idx = filteredCurrencies.findIndex(c => c.code === value);
      const initialIdx = idx >= 0 ? idx : 0;
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
        scrollIndexIntoView(initialIdx);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, value, filteredCurrencies]);

  function handleSelect(code: string) {
    onChange(code);
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
      if (filteredCurrencies.length === 0) return;
      setHighlightedIndex(prev => {
        const next = prev < filteredCurrencies.length - 1 ? prev + 1 : 0;
        scrollIndexIntoView(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredCurrencies.length === 0) return;
      setHighlightedIndex(prev => {
        const next = prev > 0 ? prev - 1 : filteredCurrencies.length - 1;
        scrollIndexIntoView(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCurrencies[highlightedIndex]) {
        handleSelect(filteredCurrencies[highlightedIndex].code);
      }
    }
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Botón Trigger */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={e => {
          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
        className={`w-full border-2 rounded-btn px-3.5 py-3 text-sm md:text-[15px] outline-none bg-white flex items-center justify-between cursor-pointer transition-colors text-left ${
          error ? 'border-red' : 'border-neutral-200 hover:border-neutral-300 focus:border-primary'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-neutral-50' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {selectedCurrency ? (
            <>
              <span className="text-base leading-none shrink-0">{selectedCurrency.flag}</span>
              <span className="font-semibold text-neutral-900">{selectedCurrency.code}</span>
              <span className="text-xs text-neutral-500 font-medium truncate">
                ({selectedCurrency.symbol})
              </span>
            </>
          ) : value ? (
            <span className="font-semibold text-neutral-900">{value}</span>
          ) : (
            <span className="text-neutral-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200 ml-1.5 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover en Desktop (>= 768px) */}
      {isOpen && !isMobile && (
        <div
          className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white border border-neutral-200 rounded-2xl shadow-xl overflow-hidden animate-fade-in min-w-[280px]"
          onKeyDown={handleKeyDown}
        >
          {/* Input de búsqueda */}
          <div className="p-2.5 border-b border-neutral-100 bg-neutral-50/70 flex items-center gap-2">
            <Search className="w-4 h-4 text-neutral-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Buscar por moneda, país o código..."
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

          {/* Lista de monedas */}
          <div
            role="listbox"
            tabIndex={-1}
            className="max-h-64 overflow-y-auto py-1 overscroll-contain"
          >
            {filteredCurrencies.length > 0 ? (
              filteredCurrencies.map((curr, index) => {
                const isSelected = value === curr.code;
                const isHighlighted = highlightedIndex === index;
                return (
                  <button
                    key={curr.code}
                    ref={el => {
                      itemRefs.current[index] = el;
                    }}
                    role="option"
                    aria-selected={isSelected}
                    type="button"
                    tabIndex={-1}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelect(curr.code)}
                    className={`w-full flex items-center justify-between px-3.5 py-2 text-sm text-left transition-colors cursor-pointer rounded-lg ${
                      isSelected
                        ? 'bg-primary-bg text-primary font-semibold'
                        : isHighlighted
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'text-neutral-800 hover:bg-neutral-100 hover:text-neutral-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg leading-none shrink-0">{curr.flag}</span>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-neutral-900">{curr.code}</span>
                          <span className="text-xs text-neutral-500 font-medium">({curr.symbol})</span>
                        </div>
                        <span className="text-xs text-neutral-500 truncate">{curr.name}</span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                  </button>
                );
              })
            ) : (
              <div className="py-6 text-center text-sm text-neutral-400">
                No se encontraron monedas
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
            aria-labelledby="currency-modal-title"
            className="relative z-[101] max-h-[88dvh] w-full bg-white rounded-t-[28px] shadow-2xl flex flex-col overflow-hidden animate-sheet-up"
            onKeyDown={handleKeyDown}
          >
            {/* Indicador de arrastre */}
            <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mt-3 mb-1 shrink-0" />

            {/* Header del Modal */}
            <div className="px-5 py-3 flex items-center justify-between border-b border-neutral-100 shrink-0">
              <div>
                <h3 id="currency-modal-title" className="text-base font-bold text-neutral-900">
                  Seleccionar moneda
                </h3>
                <p className="text-xs text-neutral-500">
                  {filteredCurrencies.length} {filteredCurrencies.length === 1 ? 'moneda' : 'monedas disponibles'}
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
                  placeholder="Buscar por moneda, país o código..."
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
              className="overflow-y-auto px-3 py-2 space-y-1 overscroll-contain flex-1 pb-8"
            >
              {filteredCurrencies.length > 0 ? (
                filteredCurrencies.map((curr) => {
                  const isSelected = value === curr.code;
                  return (
                    <button
                      key={curr.code}
                      role="option"
                      aria-selected={isSelected}
                      type="button"
                      onClick={() => handleSelect(curr.code)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-primary-bg text-primary font-semibold border border-primary/20'
                          : 'text-neutral-800 hover:bg-neutral-50 active:bg-neutral-100 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl leading-none shrink-0">{curr.flag}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-neutral-900 text-sm">
                              {curr.code}
                            </span>
                            <span className="text-xs text-neutral-500 font-medium">
                              ({curr.symbol})
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 truncate">{curr.name}</p>
                        </div>
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
                  No se encontraron monedas para &ldquo;{search}&rdquo;
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
