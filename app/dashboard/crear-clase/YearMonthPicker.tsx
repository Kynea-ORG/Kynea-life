'use client';
import { CalendarDays, Check } from 'lucide-react';
import { calendarWindow, listSelectableMonths, monthLabel } from '@/lib/classes/series';

// Calendario de 12 meses para repetir una clase Mensual en otros meses del año.
// Cada mes marcado = una copia independiente en borrador (ver lib/classes/seriesCopies.ts).
export default function YearMonthPicker({
  today,
  startDate,
  value,
  onChange,
}: {
  today: string;
  startDate: string;
  value: string[];
  onChange: (months: string[]) => void;
}) {
  const selectable = new Set(listSelectableMonths(today, startDate));
  const startMonth = /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? startDate.slice(0, 7) : null;
  if (!startMonth) return null;

  const months = calendarWindow(today);
  const toggle = (m: string) => {
    const next = value.includes(m) ? value.filter(x => x !== m) : [...value, m];
    onChange(next.sort());
  };

  return (
    <div className="border border-neutral-200 rounded-xl p-3 sm:p-4 bg-neutral-50/50 space-y-2.5">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-neutral-500 shrink-0" aria-hidden="true" />
        <p className="text-xs font-bold text-neutral-700">Repetir esta clase en otros meses</p>
      </div>

      <div role="group" aria-label="Meses del año" className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
        {months.map((m, i) => {
          const isStart = m === startMonth;
          const selected = isStart || value.includes(m);
          const enabled = selectable.has(m);
          const showYear = i === 0 || m.endsWith('-01');
          return (
            <button
              key={m}
              type="button"
              aria-pressed={selected}
              aria-label={monthLabel(m) + (isStart ? ' (mes inicial)' : '')}
              disabled={isStart || !enabled}
              onClick={() => toggle(m)}
              className={`text-xs px-2 py-1.5 rounded-xl border-2 font-semibold transition-colors flex items-center justify-center gap-1 ${
                isStart
                  ? 'bg-neutral-200 text-neutral-600 border-neutral-200 cursor-default'
                  : selected
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : enabled
                      ? 'border-neutral-200 text-neutral-600 hover:border-neutral-900'
                      : 'border-neutral-100 text-neutral-300 cursor-not-allowed'
              }`}
            >
              {isStart && <Check className="w-3 h-3" aria-hidden="true" />}
              {monthLabel(m, { short: true })}
              {showYear && <span className="text-[10px] font-medium opacity-60">{m.slice(0, 4)}</span>}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] leading-snug text-neutral-500">
        {value.length === 0
          ? 'Marca los meses en que repites esta clase: creamos una copia por cada mes, con los mismos días y horarios.'
          : `${value.length} ${value.length === 1 ? 'copia' : 'copias'} en borrador · se publican solas 14 días antes de cada inicio (o publícalas antes desde Mis clases).`}
      </p>
    </div>
  );
}
