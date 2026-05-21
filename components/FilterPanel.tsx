'use client';
import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { DANCE_STYLES, LEVELS } from '@/lib/mockData';

export interface Filters {
  city: string;
  district: string;
  styles: string[];
  level: string;
  days: string[];
  timeOfDay: string;
  modality: string;
  priceRange: string;
  type: string;
  withSpots: boolean;
}

interface FilterPanelProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  className?: string;
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const PRICE_RANGES = ['Gratis', 'Hasta S/50', 'S/50–S/150', 'S/150+'];
const TYPES = ['Clase', 'Taller', 'Curso', 'Masterclass', 'Intensivo'];
const MODALITIES = ['Presencial', 'Online', 'Híbrida'];

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

  const toggleStyle = (s: string) => {
    const arr = filters.styles.includes(s)
      ? filters.styles.filter(x => x !== s)
      : [...filters.styles, s];
    set('styles', arr);
  };

  const toggleDay = (d: string) => {
    const arr = filters.days.includes(d)
      ? filters.days.filter(x => x !== d)
      : [...filters.days, d];
    set('days', arr);
  };

  const activeCount = [
    filters.city, filters.district, filters.level, filters.timeOfDay,
    filters.modality, filters.priceRange, filters.type,
  ].filter(Boolean).length + filters.styles.length + filters.days.length + (filters.withSpots ? 1 : 0);

  return (
    <div className={`bg-white ${className}`}>
      {activeCount > 0 && (
        <div className="flex items-center justify-between mb-4">
          <span className="text-[13px] text-neutral-500">{activeCount} filtro{activeCount !== 1 ? 's' : ''} activo{activeCount !== 1 ? 's' : ''}</span>
          <button
            className="text-[13px] text-neutral-900 font-semibold flex items-center gap-1 hover:underline"
            onClick={() => onChange({ city: '', district: '', styles: [], level: '', days: [], timeOfDay: '', modality: '', priceRange: '', type: '', withSpots: false })}
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
              onClick={() => toggleStyle(s)}
              className={filters.styles.includes(s) ? 'tag-active text-[11px] px-3 py-1' : 'tag text-[11px] px-3 py-1'}
            >
              {s}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Nivel">
        <div className="flex flex-col gap-2">
          {LEVELS.map(l => (
            <label key={l} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="level"
                checked={filters.level === l}
                onChange={() => set('level', filters.level === l ? '' : l)}
                className="accent-neutral-900"
              />
              <span className="text-[13px] text-neutral-700">{l}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Día de la semana">
        <div className="flex flex-wrap gap-2">
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
        {['Mañana (6–12)', 'Tarde (12–18)', 'Noche (18–23)'].map(t => (
          <label key={t} className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="radio"
              name="timeOfDay"
              checked={filters.timeOfDay === t}
              onChange={() => set('timeOfDay', filters.timeOfDay === t ? '' : t)}
              className="accent-neutral-900"
            />
            <span className="text-[13px] text-neutral-700">{t}</span>
          </label>
        ))}
      </Section>

      <Section title="Modalidad">
        {MODALITIES.map(m => (
          <label key={m} className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="radio"
              name="modality"
              checked={filters.modality === m}
              onChange={() => set('modality', filters.modality === m ? '' : m)}
              className="accent-neutral-900"
            />
            <span className="text-[13px] text-neutral-700">{m}</span>
          </label>
        ))}
      </Section>

      <Section title="Precio">
        {PRICE_RANGES.map(p => (
          <label key={p} className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="radio"
              name="price"
              checked={filters.priceRange === p}
              onChange={() => set('priceRange', filters.priceRange === p ? '' : p)}
              className="accent-neutral-900"
            />
            <span className="text-[13px] text-neutral-700">{p}</span>
          </label>
        ))}
      </Section>

      <Section title="Tipo">
        {TYPES.map(t => (
          <label key={t} className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="radio"
              name="type"
              checked={filters.type === t}
              onChange={() => set('type', filters.type === t ? '' : t)}
              className="accent-neutral-900"
            />
            <span className="text-[13px] text-neutral-700">{t}</span>
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
