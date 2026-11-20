'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarCheck, Check, Clock, Loader2, MapPin, Minus, Plus, ShieldCheck, Wallet, X } from 'lucide-react';
import SmartImage from '@/components/SmartImage';
import { DanceClass } from '@/lib/types';
import type { ClassSession } from '@/lib/bookings/types';
import { sessionSpotsLeft } from '@/lib/bookings/mappers';
import { reserveBooking, listClassSessions } from '@/lib/bookings/actions';
import { cancellationDeadline, classTimingLabel, countdownLabel, daysUntil, formatLongDate } from '@/lib/bookings/dates';
import { getTodayLima } from '@/lib/classes/helpers';
import { trackBookingCreated } from '@/lib/analytics';
import ClassTips from './ClassTips';
import AddToCalendar from './AddToCalendar';

const MAX_SEATS = 4;
const NOTE_MAX = 500;

type Step = 'date' | 'details' | 'confirm' | 'done';

const POLICY_HUMAN = {
  flexible: 'hasta 24 horas antes',
  moderada: 'hasta 48 horas antes',
  estricta: 'hasta 7 días antes',
} as const;

function spotsChip(left: number | null): { text: string; tone: string } {
  if (left === null) return { text: 'Hay cupos', tone: 'bg-green-bg text-green-text' };
  if (left === 0) return { text: 'Completo', tone: 'bg-neutral-100 text-neutral-500' };
  if (left <= 3) return { text: left === 1 ? '¡Último cupo!' : `¡Últimos ${left} cupos!`, tone: 'bg-yellow-bg text-yellow-dark' };
  return { text: `${left} cupos`, tone: 'bg-green-bg text-green-text' };
}

export default function BookingDialog({ cls, onClose }: { cls: DanceClass; onClose: () => void }) {
  const bySession = cls.bookingMode === 'session';
  const [step, setStep] = useState<Step>(bySession ? 'date' : 'details');
  const [sessions, setSessions] = useState<ClassSession[] | null>(bySession ? null : []);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [seats, setSeats] = useState(1);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const today = getTodayLima();

  useEffect(() => {
    if (!bySession) return;
    let cancelled = false;
    listClassSessions(cls.id).then(rows => { if (!cancelled) setSessions(rows); });
    return () => { cancelled = true; };
  }, [bySession, cls.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const selected = sessions?.find(s => s.id === sessionId) ?? null;
  const firstSlot = cls.timeSlots?.[0];
  const eventDate = bySession ? selected?.date : cls.startDate;
  const startTime = bySession ? selected?.startTime : firstSlot?.startTime;
  const endTime = bySession ? selected?.endTime : firstSlot?.endTime;
  const spotsLeft = bySession ? (selected ? sessionSpotsLeft(selected) : null) : (cls.availableSpots ?? null);
  const maxSeats = Math.max(1, Math.min(MAX_SEATS, spotsLeft ?? MAX_SEATS));
  const unitPrice = cls.priceType === 'Gratis' ? 0 : (cls.offerPrice || cls.price);
  const total = unitPrice * seats;
  const timing = eventDate ? (bySession ? countdownLabel(daysUntil(eventDate, today)) : classTimingLabel(eventDate, cls.endDate, today)) : null;
  const policy = cls.cancellationPolicy ?? 'moderada';
  const deadline = eventDate ? cancellationDeadline(eventDate, startTime, policy) : null;
  const place = [cls.venueName, cls.address].filter(Boolean).join(', ') || (cls.modality === 'Online' ? 'Clase online' : '');

  const steps: Step[] = bySession ? ['date', 'details', 'confirm'] : ['details', 'confirm'];
  const stepIndex = steps.indexOf(step);
  const back = () => { setError(null); setStep(steps[Math.max(stepIndex - 1, 0)]); };

  // Agrupa las fechas por mes para que la lista larga se lea como un calendario.
  const byMonth = useMemo(() => {
    const groups = new Map<string, ClassSession[]>();
    for (const s of sessions ?? []) {
      const key = new Date(`${s.date}T12:00:00`).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
      groups.set(key, [...(groups.get(key) ?? []), s]);
    }
    return [...groups.entries()];
  }, [sessions]);

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await reserveBooking({ classId: cls.id, sessionId: bySession ? sessionId : null, seats, note });
      if (!result.ok) { setError(result.error.message); return; }
      trackBookingCreated({
        classId: cls.id, className: cls.title, teacherId: cls.teacher.id,
        bookingMode: bySession ? 'session' : 'class', seats, value: total, currency: cls.currency,
      });
      setBookingId(result.data.bookingId);
      setStep('done');
    });
  };

  const event = eventDate && startTime && endTime
    ? { title: cls.title, date: eventDate, startTime, endTime, location: place || undefined,
        details: [cls.toBring?.length ? `Lleva: ${cls.toBring.join(', ')}` : '', cls.clothing ? `Ropa: ${cls.clothing}` : ''].filter(Boolean).join('\n') || undefined }
    : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-neutral-900/60 p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog" aria-modal="true" aria-label="Reservar clase"
        onClick={e => e.stopPropagation()}
        className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[94vh] flex flex-col overflow-hidden"
      >
        {/* Cabecera fija: qué estás reservando */}
        <div className="flex items-center gap-3 p-4 border-b border-neutral-200">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
            {cls.coverImage && <SmartImage src={cls.coverImage} alt="" fill sizes="48px" className="object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-[15px] text-neutral-900 leading-tight truncate">{cls.title}</p>
            <p className="text-[12px] text-neutral-600 truncate">con {cls.teacher.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center active:scale-90 transition-transform shrink-0">
            <X className="w-4 h-4 text-neutral-900" />
          </button>
        </div>

        {step !== 'done' && (
          <div className="px-4 pt-3" aria-label={`Paso ${stepIndex + 1} de ${steps.length}`}>
            <div className="flex gap-1.5">
              {steps.map((s, i) => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= stepIndex ? 'bg-primary' : 'bg-neutral-200'}`} />
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {step === 'date' && (
            <div>
              <h2 className="text-lg font-black text-neutral-900">¿Qué día quieres ir?</h2>
              <p className="text-sm text-neutral-600 mt-0.5 mb-4">Elige la fecha. Puedes reservar otra más adelante.</p>
              {sessions === null ? (
                <p className="text-sm text-neutral-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Buscando fechas…</p>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-neutral-600">Todavía no hay fechas abiertas. Escríbele a {cls.teacher.name.split(' ')[0]} por WhatsApp o Instagram para preguntar.</p>
              ) : (
                <div className="space-y-5">
                  {byMonth.map(([month, rows]) => (
                    <div key={month}>
                      <p className="text-[13px] font-bold text-neutral-700 capitalize mb-2">{month}</p>
                      <div className="grid gap-2">
                        {rows.map(s => {
                          const left = sessionSpotsLeft(s);
                          const full = left === 0;
                          const chip = spotsChip(left);
                          const d = new Date(`${s.date}T12:00:00`);
                          const away = daysUntil(s.date, today);
                          const isSel = sessionId === s.id;
                          return (
                            <button key={s.id} type="button" disabled={full} aria-pressed={isSel}
                              onClick={() => { setSessionId(s.id); setSeats(1); }}
                              className={`flex items-center gap-3 text-left p-2.5 rounded-xl border-2 transition-[border-color,background-color] ${
                                full ? 'border-neutral-100 bg-neutral-50 opacity-60 cursor-not-allowed'
                                  : isSel ? 'border-primary bg-primary-bg' : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                              }`}>
                              <span className={`w-12 shrink-0 rounded-lg py-1.5 text-center ${isSel ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-900'}`}>
                                <span className="block text-[10px] font-bold leading-none opacity-80">{d.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '')}</span>
                                <span className="block text-[20px] font-black leading-tight">{d.getDate()}</span>
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-[14px] font-bold text-neutral-900">{s.startTime} – {s.endTime}</span>
                                <span className="block text-[12px] text-neutral-600">{countdownLabel(away)}</span>
                              </span>
                              <span className={`text-[11px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${chip.tone}`}>{chip.text}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-black text-neutral-900">Cuéntanos cómo vienes</h2>
                {eventDate && (
                  <p className="text-sm text-neutral-600 mt-0.5 capitalize">
                    {formatLongDate(eventDate)}{startTime ? ` · ${startTime}` : ''}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3">
                <div>
                  <p className="text-[14px] font-bold text-neutral-900">¿Cuántos van?</p>
                  <p className="text-[12px] text-neutral-600">{spotsLeft != null ? `Quedan ${spotsLeft} cupos` : 'Tú y quien te acompañe'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" aria-label="Menos cupos" disabled={seats <= 1} onClick={() => setSeats(n => n - 1)}
                    className="w-9 h-9 rounded-full border border-neutral-300 flex items-center justify-center disabled:opacity-40"><Minus className="w-4 h-4" /></button>
                  <span className="w-5 text-center font-bold" aria-live="polite">{seats}</span>
                  <button type="button" aria-label="Más cupos" disabled={seats >= maxSeats} onClick={() => setSeats(n => n + 1)}
                    className="w-9 h-9 rounded-full border border-neutral-300 flex items-center justify-center disabled:opacity-40"><Plus className="w-4 h-4" /></button>
                </div>
              </div>

              <div>
                <label htmlFor="booking-note" className="block text-[14px] font-bold text-neutral-900">
                  Un mensaje para {cls.teacher.name.split(' ')[0]} <span className="font-medium text-neutral-500">(opcional)</span>
                </label>
                <textarea id="booking-note" value={note} onChange={e => setNote(e.target.value.slice(0, NOTE_MAX))} rows={3}
                  placeholder="Tu nivel, si tienes alguna lesión, qué esperas de la clase…"
                  className="input mt-1.5 w-full resize-none" />
                <p className="text-[11px] text-neutral-500 mt-1 text-right">{note.length}/{NOTE_MAX}</p>
              </div>

              <p className="flex items-start gap-2 text-[12px] text-neutral-600 bg-neutral-50 rounded-lg p-3">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                {cls.teacher.name.split(' ')[0]} verá tu nombre, tu foto y tu mensaje para recibirte mejor. Nunca verá tu correo ni tu teléfono.
              </p>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-neutral-900">Revisa y confirma</h2>

              <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-200 text-[14px]">
                {eventDate && (
                  <div className="flex items-start gap-3 p-3">
                    <CalendarCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-bold text-neutral-900 capitalize">{formatLongDate(eventDate)}</p>
                      <p className="text-[12px] text-neutral-600">
                        {startTime && endTime ? `${startTime} – ${endTime} · ` : ''}{timing ?? ''}
                      </p>
                    </div>
                  </div>
                )}
                {place && (
                  <div className="flex items-start gap-3 p-3">
                    <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-bold text-neutral-900">{place}</p>
                      {cls.reference && <p className="text-[12px] text-neutral-600">{cls.reference}</p>}
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 p-3">
                  <Wallet className="w-4 h-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                  <div className="flex-1">
                    <div className="flex justify-between font-bold text-neutral-900">
                      <span>{seats} cupo{seats !== 1 ? 's' : ''}</span>
                      <span>{total === 0 ? 'Gratis' : `${cls.currency} ${total.toFixed(2)}`}</span>
                    </div>
                    <p className="text-[12px] text-neutral-600 mt-0.5">
                      {total === 0
                        ? 'No tienes que pagar nada.'
                        : 'Hoy no pagas nada aquí. Le pagas directo a tu profesor el día de la clase. Muy pronto podrás pagar en Kynea con tarjeta o Yape.'}
                    </p>
                  </div>
                </div>
              </div>

              <ClassTips footwear={cls.footwear} clothing={cls.clothing} toBring={cls.toBring} requirements={cls.requirements} teacherName={cls.teacher.name} />

              <p className="text-[12px] text-neutral-600 leading-relaxed">
                <b className="text-neutral-900">¿Cambio de planes? Sin problema.</b>{' '}
                Puedes cancelar {POLICY_HUMAN[policy]} desde «Mis reservas» y tu cupo queda libre para otra persona.
                {deadline && <> Tienes tiempo hasta el {deadline.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', timeZone: 'America/Lima' })}.</>}
              </p>

              {error && <p role="alert" className="text-sm text-red">{error}</p>}
            </div>
          )}

          {step === 'done' && (
            <div className="text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-green-bg flex items-center justify-center mb-3">
                <Check className="w-7 h-7 text-green-text" />
              </div>
              <h2 className="text-xl font-black text-neutral-900">¡Tu cupo está listo!</h2>
              {timing && (
                <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-bold text-primary bg-primary-bg rounded-full px-3 py-1">
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" /> {timing}
                </p>
              )}
              <p className="text-sm text-neutral-600 mt-3">
                {cls.teacher.name.split(' ')[0]} ya sabe que vas. Te mandaremos los detalles por correo.
              </p>
              {event && bookingId && (
                <div className="mt-4 flex flex-col items-center gap-2">
                  <p className="text-[12px] font-bold text-neutral-700">Guárdalo para no olvidarlo</p>
                  <AddToCalendar event={event} uid={bookingId} className="justify-center" />
                </div>
              )}
              <div className="mt-5 text-left">
                <ClassTips footwear={cls.footwear} clothing={cls.clothing} toBring={cls.toBring} requirements={cls.requirements} teacherName={cls.teacher.name} />
              </div>
              {cls.mapsUrl && (
                <a href={cls.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm inline-flex items-center gap-1.5 mt-4">
                  <MapPin className="w-4 h-4" aria-hidden="true" /> Cómo llegar
                </a>
              )}
            </div>
          )}
        </div>

        {/* Pie fijo con la acción principal */}
        <div className="border-t border-neutral-200 p-4 flex items-center gap-3">
          {step === 'done' ? (
            <Link href="/dashboard/alumno/reservas" className="btn-primary w-full py-3.5 text-center">Ver mis reservas</Link>
          ) : (
            <>
              {stepIndex > 0 && (
                <button type="button" onClick={back} aria-label="Volver" className="w-11 h-11 rounded-btn border border-neutral-300 flex items-center justify-center shrink-0">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              {step === 'confirm' ? (
                <button type="button" onClick={confirm} disabled={isPending}
                  className="btn-primary flex-1 py-3.5 flex items-center justify-center gap-2 disabled:opacity-50">
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />} Confirmar reserva
                </button>
              ) : (
                <button type="button" onClick={() => setStep(steps[stepIndex + 1])}
                  disabled={step === 'date' && !selected}
                  className="btn-primary flex-1 py-3.5 disabled:opacity-50 disabled:cursor-not-allowed">
                  {step === 'date' && !selected ? 'Elige una fecha' : 'Continuar'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
