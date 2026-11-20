'use client';
import { useMemo, useState, useTransition } from 'react';
import { CalendarCheck, Check, ChevronDown, MessageSquareText, Sparkles, UserX, X } from 'lucide-react';
import SmartImage from '@/components/SmartImage';
import { InstagramIcon } from '@/components/icons/SocialIcons';
import type { TeacherBooking } from '@/lib/bookings/types';
import { bookingStatusLabel } from '@/lib/bookings/rules';
import { countdownLabel, formatLongDate } from '@/lib/bookings/dates';
import { groupTeacherBookings, teacherSummary, type BookingGroup } from '@/lib/bookings/grouping';
import { setBookingAttendance, cancelBooking, cancelClassSession } from '@/lib/bookings/actions';

type Tab = 'upcoming' | 'toClose' | 'history';
type ActionResult = { ok: boolean; error?: { message: string } };

const STATUS_TONE: Record<string, string> = {
  confirmed: 'bg-green-bg text-green-text',
  attended: 'bg-primary-bg text-primary',
  no_show: 'bg-yellow-bg text-yellow-dark',
  cancelled: 'bg-neutral-100 text-neutral-500',
  expired: 'bg-neutral-100 text-neutral-500',
};

function Avatar({ name, photo, size = 40 }: { name: string; photo?: string; size?: number }) {
  return (
    <span className="relative rounded-full overflow-hidden bg-primary-bg text-primary font-black flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {photo ? <SmartImage src={photo} alt="" fill sizes={`${size}px`} className="object-cover" /> : name.charAt(0).toUpperCase()}
    </span>
  );
}

function memberSince(date?: string): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
}

export default function ReservasClient({ bookings, today }: { bookings: TeacherBooking[]; today: string }) {
  const groups = useMemo(() => groupTeacherBookings(bookings, today), [bookings, today]);
  const summary = teacherSummary(groups);
  const [tab, setTab] = useState<Tab>(groups.toClose.length > 0 && groups.upcoming.length === 0 ? 'toClose' : 'upcoming');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const run = (id: string, fn: () => Promise<ActionResult>) => {
    setError(null);
    setBusy(id);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error?.message ?? 'No se pudo completar la acción.');
      setBusy(null);
    });
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'upcoming', label: 'Próximas', count: groups.upcoming.length },
    { id: 'toClose', label: 'Por cerrar', count: groups.toClose.length },
    { id: 'history', label: 'Historial', count: groups.history.length },
  ];
  const list = groups[tab];

  return (
    <div className="p-6 lg:p-8 w-full max-w-4xl">
      <h1 className="text-2xl font-black text-neutral-900">Reservas</h1>
      <p className="text-neutral-600 text-sm mt-1 mb-6">Quién viene a tus clases y cómo prepararte para recibirlos.</p>

      {bookings.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card-dash p-4">
            <p className="text-[26px] font-black text-neutral-900 leading-none">{summary.upcomingPeople}</p>
            <p className="text-[12px] text-neutral-600 mt-1">personas esperadas</p>
          </div>
          <div className="card-dash p-4">
            <p className="text-[16px] font-black text-neutral-900 leading-tight capitalize">
              {summary.nextDate ? formatLongDate(summary.nextDate) : 'Sin fechas'}
            </p>
            <p className="text-[12px] text-neutral-600 mt-1">próxima clase con reservas</p>
          </div>
          <button type="button" onClick={() => setTab('toClose')}
            className={`card-dash p-4 text-left ${summary.toClose > 0 ? 'bg-yellow-bg border-yellow-dark/30' : ''}`}>
            <p className="text-[26px] font-black text-neutral-900 leading-none">{summary.toClose}</p>
            <p className="text-[12px] text-neutral-600 mt-1">{summary.toClose === 1 ? 'clase por cerrar' : 'clases por cerrar'}</p>
          </button>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red mb-4">{error}</p>}

      {bookings.length === 0 ? (
        <div className="card-muted p-10 text-center">
          <CalendarCheck className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="font-semibold text-neutral-700 mb-1">Todavía no tienes reservas</p>
          <p className="text-sm text-neutral-600">Activa «Reservas en Kynea» al crear o editar una clase y tus alumnos podrán apartar su cupo.</p>
        </div>
      ) : (
        <>
          <div role="tablist" className="flex gap-1 border-b border-neutral-200 mb-5">
            {tabs.map(t => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} type="button" onClick={() => setTab(t.id)}
                className={`px-3.5 py-2.5 text-[14px] font-bold -mb-px border-b-2 transition-colors ${
                  tab === t.id ? 'border-primary text-primary' : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}>
                {t.label}{t.count > 0 && <span className="ml-1.5 text-[11px] bg-neutral-100 text-neutral-600 rounded-full px-1.5 py-0.5">{t.count}</span>}
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <p className="text-sm text-neutral-600 py-6 text-center">
              {tab === 'toClose' ? 'Todo al día: no tienes clases pendientes de cerrar.' : 'No hay nada por aquí todavía.'}
            </p>
          ) : (
            <div className="space-y-5">
              {list.map(g => (
                <GroupCard key={g.key} group={g} tab={tab} busy={busy} open={open} setOpen={setOpen} run={run} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GroupCard({ group: g, tab, busy, open, setOpen, run }: {
  group: BookingGroup; tab: Tab; busy: string | null; open: string | null;
  setOpen: (id: string | null) => void; run: (id: string, fn: () => Promise<ActionResult>) => void;
}) {
  const pct = g.capacity ? Math.min(100, Math.round((g.taken / g.capacity) * 100)) : null;
  const ordered = [...g.bookings].sort((a, b) => Number(['cancelled', 'expired'].includes(a.status)) - Number(['cancelled', 'expired'].includes(b.status)));

  return (
    <section className="card-dash overflow-hidden">
      <header className="p-4 bg-neutral-50 border-b border-neutral-200">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-extrabold text-neutral-900 truncate">{g.classTitle}</p>
            <p className="text-[13px] text-neutral-600 capitalize">
              {g.date ? formatLongDate(g.date) : 'Fecha por definir'}{g.startTime ? ` · ${g.startTime}` : ''}
            </p>
          </div>
          {g.daysAway !== null && tab === 'upcoming' && (
            <span className="text-[12px] font-bold text-primary bg-primary-bg rounded-full px-2.5 py-1 whitespace-nowrap">{countdownLabel(g.daysAway)}</span>
          )}
        </div>
        <div className="mt-3 flex items-center gap-3">
          {pct !== null && (
            <div className="flex-1 h-2 rounded-full bg-neutral-200 overflow-hidden" role="progressbar" aria-valuenow={g.taken} aria-valuemin={0} aria-valuemax={g.capacity}>
              <div className={`h-full rounded-full ${pct >= 100 ? 'bg-yellow-dark' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
            </div>
          )}
          <p className="text-[12px] font-bold text-neutral-700 whitespace-nowrap">
            {g.capacity ? `${g.taken} de ${g.capacity} cupos` : `${g.taken} cupo${g.taken !== 1 ? 's' : ''}`}
          </p>
          {g.sessionId && tab === 'upcoming' && (
            <button type="button" disabled={busy === g.key} className="text-[12px] font-semibold text-red hover:underline whitespace-nowrap"
              onClick={() => {
                if (window.confirm('¿Cancelar esta fecha? Se cancelarán todas las reservas y tus alumnos recibirán un aviso.')) {
                  run(g.key, () => cancelClassSession(g.sessionId!, 'Fecha cancelada por el profesor'));
                }
              }}>
              Cancelar fecha
            </button>
          )}
        </div>
      </header>

      <ul className="divide-y divide-neutral-100">
        {ordered.map(b => {
          const isOpen = open === b.id;
          const inactive = b.status === 'cancelled' || b.status === 'expired';
          const since = memberSince(b.studentSince);
          return (
            <li key={b.id} className={inactive ? 'opacity-60' : ''}>
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : b.id)}
                className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-neutral-50 transition-colors">
                <Avatar name={b.studentName} photo={b.studentPhoto} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[14px] text-neutral-900 truncate">{b.studentName}</span>
                    {b.seats > 1 && <span className="text-[11px] font-bold text-neutral-600 bg-neutral-100 rounded-full px-2 py-0.5">+{b.seats - 1} acompañante{b.seats > 2 ? 's' : ''}</span>}
                    {b.priorBookings > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary"><Sparkles className="w-3 h-3" aria-hidden="true" />Vuelve a tus clases</span>
                    ) : b.status === 'confirmed' && (
                      <span className="text-[11px] font-bold text-green-text">Primera vez contigo</span>
                    )}
                  </span>
                  {b.note && (
                    <span className="flex items-center gap-1 text-[12px] text-neutral-600 mt-0.5 truncate">
                      <MessageSquareText className="w-3 h-3 shrink-0" aria-hidden="true" />{b.note}
                    </span>
                  )}
                </span>
                <span className={`text-[11px] font-bold rounded-full px-2 py-1 whitespace-nowrap ${STATUS_TONE[b.status] ?? 'bg-neutral-100 text-neutral-600'}`}>
                  {bookingStatusLabel(b.status)}
                </span>
                <ChevronDown className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 pl-[68px] space-y-3 animate-fade-in">
                  {b.note && (
                    <div className="rounded-lg bg-primary-bg/60 border border-primary/15 p-3">
                      <p className="text-[11px] font-bold text-primary mb-0.5">Te escribió</p>
                      <p className="text-[13px] text-neutral-800 whitespace-pre-line">{b.note}</p>
                    </div>
                  )}
                  <div className="text-[13px] text-neutral-700 space-y-1">
                    {b.studentBio && <p>{b.studentBio}</p>}
                    <p className="text-[12px] text-neutral-500">
                      {[b.studentDistrict, since ? `En Kynea desde ${since}` : null, b.priorBookings > 0 ? `${b.priorBookings} reserva${b.priorBookings !== 1 ? 's' : ''} anterior${b.priorBookings !== 1 ? 'es' : ''} contigo` : null]
                        .filter(Boolean).join(' · ')}
                    </p>
                    {b.studentInstagram && (
                      <a href={`https://instagram.com/${b.studentInstagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline">
                        <InstagramIcon className="w-3.5 h-3.5" aria-hidden="true" />@{b.studentInstagram.replace(/^@/, '')}
                      </a>
                    )}
                    <p className="text-[12px] text-neutral-500">
                      {b.priceAmount > 0 ? `Por cobrar en la clase: ${b.currency} ${b.priceAmount.toFixed(2)}` : 'Reserva gratuita'}
                    </p>
                  </div>

                  {b.status === 'confirmed' && (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={busy === b.id} onClick={() => run(b.id, () => setBookingAttendance(b.id, 'attended'))}
                        className="btn-primary btn-sm inline-flex items-center gap-1.5"><Check className="w-4 h-4" aria-hidden="true" />Vino</button>
                      <button type="button" disabled={busy === b.id} onClick={() => run(b.id, () => setBookingAttendance(b.id, 'no_show'))}
                        className="btn-outline btn-sm inline-flex items-center gap-1.5"><UserX className="w-4 h-4" aria-hidden="true" />No vino</button>
                      <button type="button" disabled={busy === b.id}
                        onClick={() => { if (window.confirm('¿Cancelar esta reserva?')) run(b.id, () => cancelBooking(b.id, 'Cancelada por el profesor')); }}
                        className="btn-outline btn-sm inline-flex items-center gap-1.5 text-red"><X className="w-4 h-4" aria-hidden="true" />Cancelar reserva</button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
