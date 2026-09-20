'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, Navigation, X, ChevronDown } from 'lucide-react';
import type { LocationOption } from '@/lib/catalog/queries';

export interface LocationAutocompleteProps {
  locationOptions: LocationOption[];
  selectedCity: string;
  selectedDistrict: string;
  onSelectLocation: (city: string, district: string) => void;
  onClearLocation: () => void;
  onUseCurrentLocation?: () => void;
  placeholder?: string;
  className?: string;
}

function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export default function LocationAutocomplete({
  locationOptions = [],
  selectedCity = '',
  selectedDistrict = '',
  onSelectLocation,
  onClearLocation,
  onUseCurrentLocation,
  placeholder = '¿Dónde bailas?',
  className = '',
}: LocationAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedLabel = useMemo(() => {
    if (!selectedCity && !selectedDistrict) return '';
    const match = locationOptions.find(opt => {
      const matchCity = opt.city.toLowerCase() === selectedCity.toLowerCase();
      const matchDistrict = (opt.district || '').toLowerCase() === selectedDistrict.toLowerCase();
      return matchCity && matchDistrict;
    });
    if (match) return match.label;
    if (selectedDistrict && selectedCity) return `${selectedDistrict}, ${selectedCity}`;
    return selectedDistrict || selectedCity;
  }, [locationOptions, selectedCity, selectedDistrict]);

  const [debouncedQuery, setDebouncedQuery] = useState(selectedLabel);
  const [inputValue, setInputValue] = useState(selectedLabel);
  const [prevSelectedLabel, setPrevSelectedLabel] = useState(selectedLabel);
  if (prevSelectedLabel !== selectedLabel) {
    setPrevSelectedLabel(selectedLabel);
    setInputValue(selectedLabel);
    setDebouncedQuery(selectedLabel);
  }

  const [isOpen, setIsOpen] = useState(false);
  const [activeOptionIndex, setActiveOptionIndex] = useState(-1);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveOptionIndex(-1);
        // Restore input value to selectedLabel if user didn't pick an option
        setInputValue(selectedLabel);
        setDebouncedQuery(selectedLabel);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedLabel]);

  const handleInputChange = (val: string) => {
    setInputValue(val);
    setIsOpen(true);
    setActiveOptionIndex(-1);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(val);
    }, 250);
  };

  const handleSelectOption = (opt: LocationOption) => {
    if (opt.activeClassesCount === 0) return;
    setInputValue(opt.label);
    setDebouncedQuery(opt.label);
    setIsOpen(false);
    setActiveOptionIndex(-1);
    onSelectLocation(opt.city, opt.district || '');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setInputValue('');
    setDebouncedQuery('');
    setIsOpen(false);
    setActiveOptionIndex(-1);
    onClearLocation();
    inputRef.current?.focus();
  };

  const hasLocation = Boolean(selectedCity || selectedDistrict || inputValue);

  const effectiveQuery = (debouncedQuery || inputValue).trim();

  const filteredOptions = useMemo(() => {
    const q = normalizeText(effectiveQuery);
    if (q.length < 2) return [];
    const matches = locationOptions.filter(opt => {
      const normLabel = normalizeText(opt.label);
      const normCity = normalizeText(opt.city);
      const normDistrict = opt.district ? normalizeText(opt.district) : '';
      return normLabel.includes(q) || normCity.includes(q) || normDistrict.includes(q);
    });
    return matches.sort((a, b) => {
      const aExact = normalizeText(a.label) === q || normalizeText(a.district || '') === q;
      const bExact = normalizeText(b.label) === q || normalizeText(b.district || '') === q;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aStarts = normalizeText(a.label).startsWith(q) || normalizeText(a.district || '').startsWith(q);
      const bStarts = normalizeText(b.label).startsWith(q) || normalizeText(b.district || '').startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return (b.activeClassesCount || 0) - (a.activeClassesCount || 0);
    });
  }, [locationOptions, effectiveQuery]);

  const isQueryTooShort = effectiveQuery.length > 0 && effectiveQuery.length < 2;

  // Keyboard navigation matching Home city selector
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        setActiveOptionIndex(prev => {
          let next = prev + 1;
          while (next < filteredOptions.length && filteredOptions[next].activeClassesCount === 0) {
            next++;
          }
          return next < filteredOptions.length ? next : prev;
        });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        setActiveOptionIndex(prev => {
          let next = prev - 1;
          while (next >= 0 && filteredOptions[next].activeClassesCount === 0) {
            next--;
          }
          return next >= 0 ? next : prev;
        });
      }
    } else if (e.key === 'Enter') {
      if (isOpen && activeOptionIndex >= 0 && activeOptionIndex < filteredOptions.length) {
        const opt = filteredOptions[activeOptionIndex];
        if (opt.activeClassesCount > 0) {
          e.preventDefault();
          handleSelectOption(opt);
        }
      } else if (isOpen && filteredOptions.length > 0) {
        const firstValid = filteredOptions.find(o => o.activeClassesCount > 0);
        if (firstValid) {
          e.preventDefault();
          handleSelectOption(firstValid);
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveOptionIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-text group"
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <MapPin
          className={`w-[19px] h-[19px] shrink-0 transition-colors ${
            hasLocation ? 'text-primary' : 'text-neutral-400 group-hover:text-neutral-600'
          }`}
        />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={e => {
            setIsOpen(true);
            if (inputValue && debouncedQuery !== inputValue) {
              setDebouncedQuery(inputValue);
            }
            e.target.select();
          }}
          onClick={() => {
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-expanded={isOpen}
          aria-controls="location-autocomplete-list"
          aria-activedescendant={activeOptionIndex >= 0 ? `location-option-${activeOptionIndex}` : undefined}
          aria-autocomplete="list"
          role="combobox"
          className="flex-1 min-w-0 text-[14.5px] text-neutral-800 placeholder:text-neutral-400 bg-transparent outline-none truncate"
        />

        {hasLocation && (
          <button
            type="button"
            onClick={handleClear}
            className="text-neutral-400 hover:text-neutral-600 p-1 rounded-full hover:bg-neutral-100 transition-colors shrink-0"
            title="Limpiar ubicación"
            aria-label="Limpiar ubicación"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-400 shrink-0 transition-transform duration-200 pointer-events-none ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </div>

      {isOpen && (
        <div
          id="location-autocomplete-list"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-neutral-200 z-50 max-h-[320px] overflow-y-auto overflow-x-hidden origin-top transition-[opacity,transform] duration-150 ease-out starting:opacity-0 starting:scale-95 py-1.5"
        >
          {/* Action: Use current GPS location */}
          {onUseCurrentLocation && (
            <button
              type="button"
              onClick={() => {
                onUseCurrentLocation();
                setIsOpen(false);
                setActiveOptionIndex(-1);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-primary hover:bg-primary-bg transition-colors border-b border-neutral-100 text-left cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5 shrink-0 fill-primary/10" />
              <span>Usar mi ubicación actual</span>
            </button>
          )}

          {/* Hint when input has less than 2 characters */}
          {effectiveQuery.length < 2 && (
            <div className="px-4 py-3 text-[12.5px] text-neutral-500">
              {isQueryTooShort ? (
                <span>Escribe al menos 2 letras para buscar distritos o ciudades…</span>
              ) : (
                <span>Escribe 2 letras de un distrito o ciudad para sugerir opciones.</span>
              )}
            </div>
          )}

          {/* Filtered suggestions (when >= 2 letters) */}
          {effectiveQuery.length >= 2 && (
            <>
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-4 text-center text-[13px] text-neutral-500">
                  No encontramos clases disponibles en &ldquo;{effectiveQuery}&rdquo;
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const hasClasses = opt.activeClassesCount > 0;
                  const isActive = activeOptionIndex === idx;
                  const isSelected = opt.label.toLowerCase() === selectedLabel.toLowerCase();

                  if (hasClasses) {
                    return (
                      <button
                        key={opt.label}
                        id={`location-option-${idx}`}
                        type="button"
                        onClick={() => handleSelectOption(opt)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors cursor-pointer group ${
                          isActive
                            ? 'bg-neutral-100 font-bold text-neutral-900'
                            : isSelected
                            ? 'bg-primary-bg/50 font-semibold text-neutral-900'
                            : 'text-neutral-700 hover:bg-neutral-50'
                        }`}
                        role="option"
                        aria-selected={isActive || isSelected}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <MapPin
                            className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                              isActive || isSelected ? 'text-primary' : 'text-neutral-400 group-hover:text-primary'
                            }`}
                          />
                          <span className="text-[13.5px] font-medium text-neutral-800 group-hover:text-neutral-900 truncate">
                            {opt.label}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-bg text-primary shrink-0">
                          {opt.activeClassesCount} {opt.activeClassesCount === 1 ? 'clase' : 'clases'}
                        </span>
                      </button>
                    );
                  }

                  // Disabled option (historical location with zero active classes)
                  return (
                    <div
                      key={opt.label}
                      id={`location-option-${idx}`}
                      className="flex items-center justify-between px-4 py-2.5 text-neutral-400 cursor-not-allowed select-none bg-neutral-50/40"
                      aria-disabled="true"
                      aria-selected={false}
                      role="option"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <MapPin className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
                        <span className="text-[13.5px] text-neutral-400 truncate">
                          {opt.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-neutral-400 italic shrink-0">
                        (Sin clases)
                      </span>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
