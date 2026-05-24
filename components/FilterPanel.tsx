'use client';
import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { DANCE_STYLES, LEVELS } from '@/lib/mockData';

export interface Filters {
  city: string;
  district: string;
  styles: string[];
  levels: string[];
  days: string[];
  timesOfDay: string[];
  modalities: string[];
  priceRanges: string[];
  types: string[];
  withSpots: boolean;
}

interface FilterPanelProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  className?: string;
}

export const EMPTY_FILTERS: Filters = {
  city: '', district: '', styles: [], levels: [], days: [],
  timesOfDay: [], modalities: [], priceRanges: [], types: [], withSpots: false,
};

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const TIMES_OF_DAY = ['Mañana (6–12)', 'Tarde (12–18)', 'Noche (18–23)'];
const PRICE_RANGES = ['Gratis', 'Hasta S/50', 'S/50–S/150', 'S/150+'];
const MODALITIES = ['Presencial', 'Online'];
// value matches ClassType from crear-clase; label matches the form options
const TYPES: { value: string; label: string }[] = [
  { value: 'clase',        label: 'Clase regular' },
  { value: 'clase-suelta', label: 'Clase suelta' },
  { value: 'taller',       label: 'Taller' },
  { value: 'curso',        label: 'Curso' },
  { value: 'masterclass',  label: 'Masterclass' },
  { value: 'evento',       label: 'Evento' },
];

function levelLabel(l: string) {
  return l === 'Todos los niveles' ? 'All levels' : l;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-neutral-100 pb-4 mb-4">
      <button
        className="flex items-center justify-between w-full text-[13px] font-semibold text-neutral-800 mb-3"
        onClick={() => setOpen(!open)}
      >
        {title}
        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && children}
    </div>
  );
}

export default function FilterPanel({ filters, onChange, className = '' }: FilterPanelProps) {
  const set = (key: keyof Filters, value: unknown) => onChange({ ...filters, [key]: value });

  const toggleIn = (key: 'styles' | 'levels' | 'days' | 'timesOfDay' | 'modalities' | 'priceRanges' | 'types', v: string) => {
    const arr = filters[key].includes(v)
      ? filters[key].filter(x => x !== v)
      : [...filters[key], v];
    set(key, arr);
  };

  const activeCount =
    filters.styles.length + filters.levels.length + filters.days.length +
    filters.timesOfDay.length + filters.modalities.length + filters.priceRanges.length +
    filters.types.length + (filters.withSpots ? 1 : 0) +
    [filters.city, filters.district].filter(Boolean).length;

  return (
    <div className={`bg-white ${className}`}>
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

      <Section title="Estilo de baile">
        <div className="flex flex-wrap gap-2">
          {DANCE_STYLES.map(s => (
            <button
              key={s}
              onClick={() => toggleIn('styles', s)}
              className={filters.styles.includes(s) ? 'tag-active text-[11px] px-3 py-1' : 'tag text-[11px] px-3 py-1'}
            >
              {s}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Nivel">
        <div className="flex flex-wrap gap-2">
          {LEVELS.map(l => (
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
        <div className="flex flex-wrap gap-2">
          {DAYS.map(d => (
            <button
              key={d}
              onClick={() => toggleIn('days', d)}
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
        {PRICE_RANGES.map(p => (
          <label key={p} className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={filters.priceRanges.includes(p)}
              onChange={() => toggleIn('priceRanges', p)}
              className="accent-neutral-900 w-4 h-4"
            />
            <span className="text-[13px] text-neutral-700">{p}</span>
          </label>
        ))}
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
