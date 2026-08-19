'use client';
import { useState } from 'react';
import { ChevronDown, Sparkles, X } from 'lucide-react';

export interface Filters {
  city: string;
  district: string;
  styles: string[];
  levels: string[];
  days: string[];
  timesOfDay: string[];
  modalities: string[];
  priceMax: number | null;
  types: string[];
  withSpots: boolean;
}

export const MAX_PRICE = 300;

// "Estilo de baile" arranca colapsado a este tamaño de grupo y crece de a
// tantos estilos por click en "Ver más" — evita que el filtro completo
// (40+ estilos) ocupe toda la pantalla por defecto.
const STYLES_GROUP_SIZE = 12;

interface FilterPanelProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  className?: string;
  danceStyles?: string[];
  levels?: string[];
  hideStyles?: boolean;
}

export const EMPTY_FILTERS: Filters = {
  city: '', district: '', styles: [], levels: [], days: [],
  timesOfDay: [], modalities: [], priceMax: null, types: [], withSpots: false,
};

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
// Special day-filter value: matches by date (today), not by weekday name —
// mutually exclusive with the weekday tags (see toggleDay in FilterPanel).
export const TODAY_TAG = 'Hoy';
const TIMES_OF_DAY = ['Mañana (6–12)', 'Tarde (12–18)', 'Noche (18–23)'];
const MODALITIES = ['Presencial', 'Online'];
// value matches ClassType from crear-clase; label matches the form options
const TYPES: { value: string; label: string }[] = [
  { value: 'clase-suelta', label: 'Clase suelta' },
  { value: 'taller',       label: 'Taller' },
  { value: 'programa',     label: 'Programa' },
  { value: 'masterclass',  label: 'Masterclass' },
  { value: 'evento',       label: 'Evento' },
  { value: 'workshop',     label: 'Workshop' },
];

function levelLabel(l: string) {
  return l === 'Todos los niveles' ? 'All levels' : l;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-neutral-100 pb-4 mb-4">
      <button
        className="flex items-center justify-between w-full text-[13px] font-semibold text-neutral-800 mb-3 active:opacity-70"
        onClick={() => setOpen(!open)}
      >
        {title}
        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ease-out ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

export default function FilterPanel({ filters, onChange, className = '', danceStyles = [], levels = [], hideStyles = false }: FilterPanelProps) {
  const [visibleStylesCount, setVisibleStylesCount] = useState(STYLES_GROUP_SIZE);
  const set = (key: keyof Filters, value: unknown) => onChange({ ...filters, [key]: value });

  const toggleIn = (key: 'styles' | 'levels' | 'timesOfDay' | 'modalities' | 'types', v: string) => {
    const arr = filters[key].includes(v)
      ? filters[key].filter(x => x !== v)
      : [...filters[key], v];
    set(key, arr);
  };

  // 'Hoy' matches by date rather than weekday name, so it's mutually
  // exclusive with the weekday tags instead of just adding to the OR set.
  const toggleDay = (d: string) => {
    if (d === TODAY_TAG) {
      set('days', filters.days.includes(TODAY_TAG) ? [] : [TODAY_TAG]);
      return;
    }
    const withoutToday = filters.days.filter(x => x !== TODAY_TAG);
    const arr = withoutToday.includes(d)
      ? withoutToday.filter(x => x !== d)
      : [...withoutToday, d];
    set('days', arr);
  };

  const activeCount =
    filters.styles.length + filters.levels.length + filters.days.length +
    filters.timesOfDay.length + filters.modalities.length + (filters.priceMax !== null ? 1 : 0) +
    filters.types.length + (filters.withSpots ? 1 : 0) +
    [filters.city, filters.district].filter(Boolean).length;

  // Los estilos ya seleccionados siempre se muestran (aunque el grupo visible
  // los hubiera dejado afuera) — nunca se esconde un filtro activo.
  const selectedStyles = danceStyles.filter(s => filters.styles.includes(s));
  const unselectedStyles = danceStyles.filter(s => !filters.styles.includes(s));
  const visibleStyles = [
    ...selectedStyles,
    ...unselectedStyles.slice(0, Math.max(visibleStylesCount - selectedStyles.length, 0)),
  ];
  const hasMoreStyles = visibleStyles.length < danceStyles.length;

  const todayActive = filters.days.includes(TODAY_TAG);

  return (
    <div className={`bg-white ${className}`}>
      <button
        onClick={() => toggleDay(TODAY_TAG)}
        className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 mb-5 text-left cursor-pointer transition-colors ${
          todayActive
            ? 'bg-primary border-primary text-white'
            : 'bg-primary-bg border-primary/30 text-neutral-900 hover:border-primary animate-pulse-soft-primary'
        }`}
      >
        <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${todayActive ? 'bg-white/20' : 'bg-white'}`}>
          <Sparkles className={`w-4 h-4 ${todayActive ? 'text-white' : 'text-primary'}`} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span className="font-bold text-[14px]">{TODAY_TAG}</span>
            <span className={`text-[9px] font-black uppercase tracking-wide rounded-full px-1.5 py-0.5 ${
              todayActive ? 'bg-white/25 text-white' : 'bg-primary text-white'
            }`}>
              Nuevo
            </span>
          </span>
          <span className={`block text-[12px] ${todayActive ? 'text-white/80' : 'text-neutral-500'}`}>
            Clases que se dictan hoy
          </span>
        </span>
      </button>

      {activeCount > 0 && (
        <div className="flex items-center justify-between mb-4">
          <span className="text-[13px] text-neutral-500">{activeCount} filtro{activeCount !== 1 ? 's' : ''} activo{activeCount !== 1 ? 's' : ''}</span>
          <button
            className="text-[13px] text-neutral-900 font-semibold flex items-center gap-1 hover:underline"
            onClick={() => onChange(EMPTY_FILTERS)}
          >
            <X className="w-3 h-3" /> Limpiar todo
          </button>
        </div>
      )}

      {!hideStyles && (
        <Section title="Estilo de baile">
          <div className="flex flex-wrap gap-2">
            {visibleStyles.map(s => (
              <button
                key={s}
                onClick={() => toggleIn('styles', s)}
                className={filters.styles.includes(s) ? 'tag-active text-[11px] px-3 py-1' : 'tag text-[11px] px-3 py-1'}
              >
                {s}
              </button>
            ))}
            {hasMoreStyles && (
              <button
                onClick={() => setVisibleStylesCount(c => c + STYLES_GROUP_SIZE)}
                className="text-[11px] font-semibold text-primary border border-primary/30 rounded-full px-3 py-1 hover:bg-primary-bg transition-colors"
              >
                Ver más
              </button>
            )}
          </div>
        </Section>
      )}

      <Section title="Nivel">
        <div className="flex flex-wrap gap-2">
          {levels.map(l => (
            <button
              key={l}
              onClick={() => toggleIn('levels', l)}
              className={filters.levels.includes(l) ? 'tag-active text-[11px] px-3 py-1' : 'tag text-[11px] px-3 py-1'}
            >
              {levelLabel(l)}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Día de la semana">
        <div className="flex flex-wrap items-center gap-2">
          {DAYS.map(d => (
            <button
              key={d}
              onClick={() => toggleDay(d)}
              className={filters.days.includes(d) ? 'tag-active text-[11px] px-3 py-1' : 'tag text-[11px] px-3 py-1'}
            >
              {d.slice(0, 3)}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Horario">
        {TIMES_OF_DAY.map(t => (
          <label key={t} className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={filters.timesOfDay.includes(t)}
              onChange={() => toggleIn('timesOfDay', t)}
              className="accent-neutral-900 w-4 h-4"
            />
            <span className="text-[13px] text-neutral-700">{t}</span>
          </label>
        ))}
      </Section>

      <Section title="Modalidad">
        {MODALITIES.map(m => (
          <label key={m} className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={filters.modalities.includes(m)}
              onChange={() => toggleIn('modalities', m)}
              className="accent-neutral-900 w-4 h-4"
            />
            <span className="text-[13px] text-neutral-700">{m}</span>
          </label>
        ))}
      </Section>

      <Section title="Precio">
        <div className="px-0.5">
          <input
            type="range"
            min={0}
            max={MAX_PRICE}
            step={10}
            value={filters.priceMax ?? MAX_PRICE}
            onChange={e => {
              const v = Number(e.target.value);
              set('priceMax', v >= MAX_PRICE ? null : v);
            }}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[11px] text-neutral-400">S/0</span>
            <span className="text-[13px] font-semibold text-neutral-900">
              {filters.priceMax === null ? 'Cualquier precio' : `Hasta S/${filters.priceMax}`}
            </span>
            <span className="text-[11px] text-neutral-400">S/{MAX_PRICE}+</span>
          </div>
        </div>
      </Section>

      <Section title="Tipo de clase">
        {TYPES.map(t => (
          <label key={t.value} className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={filters.types.includes(t.value)}
              onChange={() => toggleIn('types', t.value)}
              className="accent-neutral-900 w-4 h-4"
            />
            <span className="text-[13px] text-neutral-700">{t.label}</span>
          </label>
        ))}
      </Section>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.withSpots}
          onChange={e => set('withSpots', e.target.checked)}
          className="accent-neutral-900 w-4 h-4"
        />
        <span className="text-[13px] font-medium text-neutral-700">Solo con cupos disponibles</span>
      </label>
    </div>
  );
}
