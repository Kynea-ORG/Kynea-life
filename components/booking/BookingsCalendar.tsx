'use client';
import { useMemo, useState } from 'react';
import { CalendarCheck, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import type { MyBooking } from '@/lib/bookings/types';
import { assignClassColors, buildMonthGrid, eventsByDate, monthLegend, monthTitle, nextEntry, type CalendarEntry } from '@/lib/bookings/calendar';
import { countdownLabel, daysUntil, formatLongDate } from '@/lib/bookings/dates';

// Un color por clase: la misma clase se ve igual en la cuadrícula, en la leyenda y en la agenda.
const PALETTE = [
  { bg: '#F5E8FC', fg: '#6D0D97', bar: '#8A11BC' },
  { bg: '#DBEAFE', fg: '#1E40AF', bar: '#3B82F6' },
  { bg: '#D1FAE5', fg: '#065F46', bar: '#10B981' },
  { bg: '#FFEDD5', fg: '#9A3412', bar: '#F97316' },
  { bg: '#FCE7F3', fg: '#9D174D', bar: '#EC4899' },
  { bg: '#FEF9C3', fg: '#854D0E', bar: '#EAB308' },
];
const color = (i: number) => PALETTE[i % PALETTE.length];
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function dayBadge(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return { weekday: d.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', ''), day: d.getDate() };
}

/** Calendario mensual con las clases que el alumno reservó en Kynea, con leyenda y agenda del mes. */
export default function BookingsCalendar({ bookings, today }: { bookings: MyBooking[]; today: string }) {
  const [year0, month0] = today.split('-').map(Number);
  const [cursor, setCursor] = useState({ year: year0, month: month0 - 1 });
  const [selected, setSelected] = useState<string | null>(null);

  const events = useMemo(() => eventsByDate(bookings), [bookings]);
  const colors = useMemo(() => assignClassColors(bookings), [bookings]);
  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
  const legend = useMemo(() => monthLegend(events, colors, cursor.year, cursor.month), [events, colors, cursor]);
  const next = useMemo(() => nextEntry(events, today), [events, today]);

  const prefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`;
  const monthCount = legend.reduce((n, l) => n + l.count, 0);
  const agendaDays = [...events.keys()].filter(d => (selected ? d === selected : d.startsWith(prefix))).sort();
  const monthName = monthTitle(cursor.year, cursor.month).split(' ')[0];

  const shift = (delta: number) => {
    const d = new Date(Date.UTC(cursor.year, cursor.month + delta, 1));
    setCursor({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
    setSelected(null);
  };
  const goToday = () => { setCursor({ year: year0, month: month0 - 1 }); setSelected(null); };

  const renderEntry = (e: CalendarEntry, i: number) => {
    const c = color(colors.get(e.classId) ?? 0);
    const past = e.date < today;
    return (
      <li key={`${e.bookingId}-${i}`} className={`flex overflow-hidden rounded-xl border border-neutral-200 ${past ? 'opacity-70' : ''}`}>
        <span className="w-1.5 shrink-0" style={{ background: c.bar }} aria-hidden="true" />
        <div className="flex-1 min-w-0 p-3">
          <p className="text-[12px] font-bold" style={{ color: c.fg }}>
            {e.startTime ?? 'Horario por confirmar'}{e.endTime ? ` – ${e.endTime}` : ''}
          </p>
          <p className="font-extrabold text-[14px] text-neutral-900 leading-tight">{e.title}</p>
          {e.teacherName && <p className="text-[12px] text-neutral-600">con {e.teacherName}</p>}
          {e.place && <p className="text-[12px] text-neutral-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 shrink-0" aria-hidden="true" /><span className="truncate">{e.place}</span></p>}
          {e.status === 'attended' && <p className="text-[11px] font-bold text-green-text mt-1">Asististe</p>}
        </div>
      </li>
    );
  };

  const nextColor = next ? color(colors.get(next.classId) ?? 0) : null;

  return (
    <div className="space-y-4">
      {next && nextColor && (
        <section aria-label="Tu próxima clase" className="rounded-2xl p-4 flex items-center gap-4" style={{ background: nextColor.bg }}>
          <span className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: nextColor.bar }}>
            <CalendarCheck className="w-6 h-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold" style={{ color: nextColor.fg }}>Tu próxima clase · {countdownLabel(daysUntil(next.date, today))}</p>
            <p className="font-black text-[16px] text-neutral-900 leading-tight truncate">{next.title}</p>
            <p className="text-[13px] text-neutral-700 capitalize">{formatLongDate(next.date)}{next.startTime ? ` · ${next.startTime}` : ''}</p>
          </div>
        </section>
      )}

      <div className="card-dash p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[20px] font-black text-neutral-900 capitalize">{monthTitle(cursor.year, cursor.month)}</h2>
            <p className="text-[12px] text-neutral-600">{monthCount === 0 ? 'Sin clases este mes' : `${monthCount} clase${monthCount !== 1 ? 's' : ''} este mes`}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={goToday} className="btn-outline btn-sm">Hoy</button>
            <button type="button" aria-label="Mes anterior" onClick={() => shift(-1)} className="w-9 h-9 rounded-full border border-neutral-300 flex items-center justify-center hover:bg-neutral-50"><ChevronLeft className="w-4 h-4" /></button>
            <button type="button" aria-label="Mes siguiente" onClick={() => shift(1)} className="w-9 h-9 rounded-full border border-neutral-300 flex items-center justify-center hover:bg-neutral-50"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1" aria-hidden="true">
          {WEEKDAYS.map(d => <div key={d} className="text-center text-[11px] font-bold text-neutral-500 py-1">{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {grid.flat().map(cell => {
            const list = events.get(cell.date) ?? [];
            const isToday = cell.date === today;
            const isSel = cell.date === selected;
            const past = cell.date < today;
            return (
              <button key={cell.date} type="button" onClick={() => setSelected(isSel ? null : cell.date)} aria-pressed={isSel}
                aria-label={`${formatLongDate(cell.date)}${list.length ? `, ${list.map(e => e.title).join(' y ')}` : ''}`}
                className={`min-h-[52px] sm:min-h-[84px] rounded-lg border p-1 flex flex-col items-stretch text-left transition-colors ${
                  isSel ? 'border-neutral-900 bg-neutral-900/5' : 'border-neutral-100 hover:border-neutral-300'
                } ${cell.inMonth ? 'bg-white' : 'bg-neutral-50'}`}>
                <span className={`self-start w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold ${
                  isToday ? 'bg-neutral-900 text-white' : cell.inMonth ? 'text-neutral-800' : 'text-neutral-300'
                }`}>{Number(cell.date.slice(8))}</span>

                {/* Móvil: un punto del color de cada clase */}
                {list.length > 0 && (
                  <span className="sm:hidden flex flex-wrap gap-0.5 mt-1 px-0.5" aria-hidden="true">
                    {list.slice(0, 4).map((e, i) => <span key={i} className="w-2 h-2 rounded-full" style={{ background: color(colors.get(e.classId) ?? 0).bar, opacity: past ? 0.45 : 1 }} />)}
                  </span>
                )}
                {/* Escritorio: hora y nombre de cada clase */}
                <span className="hidden sm:flex flex-col gap-0.5 mt-1" aria-hidden="true">
                  {list.slice(0, 2).map((e, i) => {
                    const c = color(colors.get(e.classId) ?? 0);
                    return (
                      <span key={i} className="truncate rounded px-1 py-0.5 text-[10.5px] font-bold leading-tight" style={{ background: c.bg, color: c.fg, opacity: past ? 0.6 : 1 }}>
                        {e.startTime ? `${e.startTime} ` : ''}{e.title}
                      </span>
                    );
                  })}
                  {list.length > 2 && <span className="text-[10.5px] font-bold text-neutral-500 px-1">+{list.length - 2} más</span>}
                </span>
              </button>
            );
          })}
        </div>

        {/* Leyenda: qué significa cada color y cada marca */}
        <div className="mt-4 pt-4 border-t border-neutral-200 space-y-3">
          {legend.length > 0 && (
            <ul className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Clases de este mes">
              {legend.map(l => (
                <li key={l.classId} className="flex items-center gap-1.5 text-[12px] text-neutral-700">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color(l.colorIndex).bar }} aria-hidden="true" />
                  <span className="font-bold truncate max-w-[200px]">{l.title}</span>
                  <span className="text-neutral-500">· {l.count} {l.count === 1 ? 'día' : 'días'}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-neutral-500">
            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-neutral-900 text-white text-[9px] font-bold flex items-center justify-center" aria-hidden="true">{Number(today.slice(8))}</span>Hoy</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 rounded border border-neutral-900 bg-neutral-900/5" aria-hidden="true" />Día elegido</span>
            <span>Los días pasados se ven más tenues.</span>
          </p>
        </div>
      </div>

      {/* Agenda: el detalle completo, día por día */}
      <section aria-live="polite" className="card-dash p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-[16px] font-black text-neutral-900 capitalize">
            {selected ? formatLongDate(selected) : `Agenda de ${monthName}`}
          </h3>
          {selected && <button type="button" onClick={() => setSelected(null)} className="text-[13px] font-bold text-primary hover:underline">Ver todo el mes</button>}
        </div>
        {agendaDays.length === 0 ? (
          <p className="text-sm text-neutral-600">{selected ? 'No tienes clases este día.' : `No tienes clases reservadas en ${monthName}.`}</p>
        ) : (
          <div className="space-y-4">
            {agendaDays.map(date => {
              const b = dayBadge(date);
              return (
                <div key={date} className="flex gap-3">
                  <div className={`w-12 shrink-0 text-center rounded-xl py-1.5 h-fit ${date === today ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-800'}`}>
                    <p className="text-[10px] font-bold uppercase leading-none opacity-80">{b.weekday}</p>
                    <p className="text-[20px] font-black leading-tight">{b.day}</p>
                  </div>
                  <ul className="flex-1 space-y-2 min-w-0">{(events.get(date) ?? []).map(renderEntry)}</ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
