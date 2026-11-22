'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowLeft, CalendarCheck, Check, Clock, Loader2, MapPin, Minus, Plus, ShieldCheck, Wallet, X } from 'lucide-react';
import SmartImage from '@/components/SmartImage';
import { useAuth } from '@/components/AuthProvider';
import PhoneCountrySelect from '@/components/PhoneCountrySelect';
import { InstagramIcon, WhatsAppIcon } from '@/components/icons/SocialIcons';
import { DanceClass } from '@/lib/types';
import type { BookingStatus, ClassSession } from '@/lib/bookings/types';
import {
  buildStudentToTeacherMessage,
  resolveTeacherChannels,
  validateBookingInstagram,
  validateBookingWhatsApp,
} from '@/lib/bookings/contact';
import { getPhoneExample, parsePhonePrefix } from '@/lib/countries';
import { sessionSpotsLeft } from '@/lib/bookings/mappers';
import { reserveBooking, listClassSessions } from '@/lib/bookings/actions';
import {
  cancellationDeadline,
  canStillCancel,
  classTimingLabel,
  countdownLabel,
  daysUntil,
  formatDeadlineLima,
  formatLongDate,
  isoWeekday,
  type CalendarEvent,
} from '@/lib/bookings/dates';
import { DAY_MAP, getTodayLima } from '@/lib/classes/helpers';
import { trackBookingCreated } from '@/lib/analytics';
import { buildGoogleMapsUrl, extractSocialHandle, formatPriceShort } from '@/lib/utils';
import ClassTips from './ClassTips';
import AddToCalendar from './AddToCalendar';

const MAX_SEATS = 4;
const MAX_MULTI_SESSIONS = 20;
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

function minAvailableSpots(list: ClassSession[]): number | null {
  const finite = list
    .map(sessionSpotsLeft)
    .filter((v): v is number => v !== null);
  return finite.length > 0 ? Math.min(...finite) : null;
}

function formatShortSession(s: ClassSession): string {
  const d = new Date(`${s.date}T12:00:00Z`);
  const wd = d.toLocaleDateString('es-PE', { weekday: 'short', timeZone: 'UTC' }).replace('.', '');
  const month = d.toLocaleDateString('es-PE', { month: 'short', timeZone: 'UTC' }).replace('.', '');
  return `${wd} ${d.getUTCDate()} ${month} · ${s.startTime}`;
}

export default function BookingDialog({ cls, onClose }: { cls: DanceClass; onClose: () => void }) {
  const { profile, refreshProfile } = useAuth();
  const bySession = cls.bookingMode === 'session';
  const [step, setStep] = useState<Step>(bySession ? 'date' : 'details');
  const [sessions, setSessions] = useState<ClassSession[] | null>(bySession ? null : []);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const [seats, setSeats] = useState(1);
  const [note, setNote] = useState('');
  const [useWaDraft, setUseWaDraft] = useState<boolean | null>(null);
  const [useIgDraft, setUseIgDraft] = useState<boolean | null>(null);
  const [waCodeDraft, setWaCodeDraft] = useState<string | null>(null);
  const [waNumberDraft, setWaNumberDraft] = useState<string | null>(null);
  const [igHandleDraft, setIgHandleDraft] = useState<string | null>(null);
  const [saveToProfile, setSaveToProfile] = useState(true);
  const [contactError, setContactError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookingIds, setBookingIds] = useState<string[]>([]);
  const [createdStatus, setCreatedStatus] = useState<BookingStatus | null>(null);
  const [isPending, startTransition] = useTransition();
  const today = getTodayLima();

  const profilePrefill = useMemo(() => {
    const parsedWa = parsePhonePrefix(profile?.whatsapp);
    const cleanWaDigits = parsedWa.number.replace(/\D/g, '');
    const waOk = validateBookingWhatsApp(cleanWaDigits).valid;

    const cleanIg = profile?.instagram ? extractSocialHandle(profile.instagram, 'instagram') : '';
    const igOk = validateBookingInstagram(cleanIg).valid;

    return {
      useWa: waOk,
      waCode: waOk ? parsedWa.code : '+51',
      waNumber: waOk ? cleanWaDigits : '',
      useIg: igOk,
      igHandle: igOk ? cleanIg : '',
    };
  }, [profile]);

  const useWa = useWaDraft ?? profilePrefill.useWa;
  const useIg = useIgDraft ?? profilePrefill.useIg;
  const waCode = waCodeDraft ?? profilePrefill.waCode;
  const waNumber = waNumberDraft ?? profilePrefill.waNumber;
  const igHandle = igHandleDraft ?? profilePrefill.igHandle;

  const waValidation = useMemo(() => validateBookingWhatsApp(waNumber), [waNumber]);
  const igValidation = useMemo(() => validateBookingInstagram(igHandle), [igHandle]);
  const hasContact = (useWa || useIg) && (!useWa || waValidation.valid) && (!useIg || igValidation.valid);
  const canSaveContactToProfile = (useWa && !profile?.whatsapp?.trim()) || (useIg && !profile?.instagram?.trim());

  useEffect(() => {
    if (!bySession) return;
    let cancelled = false;
    listClassSessions(cls.id)
      .then(rows => {
        if (!cancelled) {
          setSessionsError(null);
          setSessions(rows);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSessions([]);
          setSessionsError('No pudimos cargar las fechas disponibles. Verifica tu sesión e inténtalo de nuevo.');
        }
      });
    return () => { cancelled = true; };
  }, [bySession, cls.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const selectedSessions = useMemo(
    () => (sessions ?? []).filter(s => sessionIds.includes(s.id)),
    [sessions, sessionIds],
  );
  const earliestSession = selectedSessions[0] ?? null;
  const isMulti = bySession && selectedSessions.length > 1;
  const sessionCount = bySession ? Math.max(selectedSessions.length, 1) : 1;

  const firstSlot = useMemo(() => {
    const slots = cls.timeSlots ?? [];
    if (!slots.length) return undefined;
    const targetDay = cls.startDate ? isoWeekday(cls.startDate) : null;
    const candidates = slots.flatMap(slot => {
      const days = slot.days?.length ? slot.days : [''];
      return days.map(d => ({ day: DAY_MAP[d] ?? 99, slot }));
    });
    candidates.sort((a, b) => {
      const aMatch = targetDay !== null && a.day === targetDay ? 0 : 1;
      const bMatch = targetDay !== null && b.day === targetDay ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      if (a.day !== b.day) return a.day - b.day;
      return (a.slot.startTime ?? '99:99').localeCompare(b.slot.startTime ?? '99:99');
    });
    return candidates[0]?.slot ?? slots[0];
  }, [cls.timeSlots, cls.startDate]);

  const isOnline = cls.modality === 'Online';
  const eventDate = bySession ? earliestSession?.date : cls.startDate;
  const startTime = bySession ? earliestSession?.startTime : firstSlot?.startTime;
  const endTime = bySession ? earliestSession?.endTime : firstSlot?.endTime;
  const spotsLeft = bySession
    ? (selectedSessions.length > 0 ? minAvailableSpots(selectedSessions) : null)
    : (cls.availableSpots ?? null);
  const maxSeats = Math.max(1, Math.min(MAX_SEATS, spotsLeft ?? MAX_SEATS));
  const unitPrice = cls.priceType === 'Gratis' ? 0 : (cls.offerPrice || cls.price || 0);
  const estimatedPerPerson = unitPrice * selectedSessions.length;
  const total = unitPrice * seats * sessionCount;
  const requiresApproval = total > 0;
  const isDonePending = (createdStatus ?? (requiresApproval ? 'pending_confirmation' : 'confirmed')) === 'pending_confirmation';
  const teacherContactMsg = buildStudentToTeacherMessage({
    teacherName: cls.teacher.name,
    classTitle: cls.title,
    date: eventDate,
    seats,
    sessionCount: bySession ? selectedSessions.length : 1,
  });
  const teacherChannels = resolveTeacherChannels({
    contactMode: cls.contactMode,
    whatsapp: cls.teacher.whatsapp,
    instagram: cls.teacher.instagram,
    message: teacherContactMsg,
  });
  const timing = eventDate ? (bySession ? countdownLabel(daysUntil(eventDate, today)) : classTimingLabel(eventDate, cls.endDate, today)) : null;
  const policy = cls.cancellationPolicy ?? 'moderada';
  const deadline = eventDate ? cancellationDeadline(eventDate, startTime, policy) : null;
  const canCancelAfterBooking = eventDate ? canStillCancel(eventDate, startTime, policy) : true;
  const place = isOnline ? 'Clase online' : [cls.venueName, cls.address].filter(Boolean).join(', ');
  const mapsHref = isOnline
    ? undefined
    : buildGoogleMapsUrl({ placeId: cls.placeId, lat: cls.lat, lng: cls.lng, address: cls.address }) ?? cls.mapsUrl;

  const steps: Step[] = bySession ? ['date', 'details', 'confirm'] : ['details', 'confirm'];
  const stepIndex = steps.indexOf(step);
  const back = () => { setError(null); setStep(steps[Math.max(stepIndex - 1, 0)]); };

  const toggleSession = (id: string) => {
    setError(null);
    const nextIds = sessionIds.includes(id)
      ? sessionIds.filter(x => x !== id)
      : sessionIds.length < MAX_MULTI_SESSIONS
        ? [...sessionIds, id]
        : sessionIds;
    setSessionIds(nextIds);
    const nextSelected = (sessions ?? []).filter(s => nextIds.includes(s.id));
    const nextSpots = nextSelected.length > 0 ? minAvailableSpots(nextSelected) : null;
    const nextMaxSeats = Math.max(1, Math.min(MAX_SEATS, nextSpots ?? MAX_SEATS));
    setSeats(n => Math.min(n, nextMaxSeats));
  };

  // Agrupa las fechas por mes para que la lista larga se lea como un calendario.
  const byMonth = useMemo(() => {
    const groups = new Map<string, ClassSession[]>();
    for (const s of sessions ?? []) {
      const key = new Date(`${s.date}T12:00:00Z`).toLocaleDateString('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      groups.set(key, [...(groups.get(key) ?? []), s]);
    }
    return [...groups.entries()];
  }, [sessions]);

  const confirm = () => {
    if (!hasContact) {
      setContactError('Ingresa tu WhatsApp o tu usuario de Instagram para que el profesor pueda coordinar contigo.');
      setStep('details');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const orderedIds = selectedSessions.map(s => s.id);
        const shouldSaveToProfile = canSaveContactToProfile && saveToProfile;
        const contactFields = {
          ...(useWa && waValidation.valid ? { whatsapp: `${waCode}${waValidation.value}` } : {}),
          ...(useIg && igValidation.valid ? { instagram: igValidation.value } : {}),
          ...(canSaveContactToProfile ? { saveContact: saveToProfile } : {}),
        };
        const payload = bySession && orderedIds.length > 1
          ? { classId: cls.id, sessionIds: orderedIds, seats, note, ...contactFields }
          : { classId: cls.id, sessionId: bySession ? (orderedIds[0] ?? null) : null, seats, note, ...contactFields };

        const result = await reserveBooking(payload);
        if (!result.ok) { setError(result.error.message); return; }
        trackBookingCreated({
          classId: cls.id, className: cls.title, teacherId: cls.teacher.id,
          bookingMode: bySession ? 'session' : 'class', seats: seats * sessionCount, value: total, currency: cls.currency,
        });
        setBookingIds(result.data.bookingIds ?? [result.data.bookingId]);
        setCreatedStatus(result.data.status ?? (requiresApproval ? 'pending_confirmation' : 'confirmed'));
        if (shouldSaveToProfile) {
          void refreshProfile();
        }
        setStep('done');
      } catch {
        setError('No pudimos completar tu reserva. Verifica tu sesión e inténtalo de nuevo.');
      }
    });
  };

  const eventDetailsText = [
    cls.toBring?.length ? `Lleva: ${cls.toBring.join(', ')}` : '',
    cls.clothing ? `Ropa: ${cls.clothing}` : '',
  ].filter(Boolean).join('\n') || undefined;

  const buildCalendarEvent = (date: string, sTime: string, eTime: string): CalendarEvent => ({
    title: cls.title,
    date,
    startTime: sTime,
    endTime: eTime,
    location: place || undefined,
    details: eventDetailsText,
  });

  const singleEvent = eventDate && startTime && endTime
    ? buildCalendarEvent(eventDate, startTime, endTime)
    : null;

  const modal = (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-neutral-900/60 p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog" aria-modal="true" aria-label="Reservar clase"
        onClick={e => e.stopPropagation()}
        className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[90dvh] sm:max-h-[85dvh] flex flex-col overflow-hidden"
      >
        {/* Cabecera fija: qué estás reservando */}
        <div className="shrink-0 flex items-center gap-3 p-4 border-b border-neutral-200">
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
          <div className="shrink-0 px-4 pt-3" aria-label={`Paso ${stepIndex + 1} de ${steps.length}`}>
            <div className="flex gap-1.5">
              {steps.map((s, i) => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= stepIndex ? 'bg-primary' : 'bg-neutral-200'}`} />
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
          {step === 'date' && (
            <div>
              <h2 className="text-lg font-black text-neutral-900">¿Qué días quieres ir?</h2>
              <p className="text-sm text-neutral-600 mt-0.5 mb-4">Elige una o varias fechas para reservarlas de una sola vez.</p>
              {selectedSessions.length > 0 && (
                <div className="mb-4 flex items-center justify-between gap-2 rounded-xl bg-primary-bg/70 border border-primary/20 px-3 py-2 text-[12.5px]">
                  <p className="font-bold text-neutral-900">
                    {selectedSessions.length} {selectedSessions.length === 1 ? 'fecha seleccionada' : 'fechas seleccionadas'}
                    {unitPrice > 0 && (
                      <span className="font-semibold text-primary">
                        {' '}· {formatPriceShort('Pago único', estimatedPerPerson, cls.currency)}
                      </span>
                    )}
                  </p>
                  {selectedSessions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => { setSessionIds([]); setSeats(1); }}
                      className="text-[12px] font-bold text-primary hover:underline shrink-0"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              )}
              {sessions === null ? (
                <p className="text-sm text-neutral-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Buscando fechas…</p>
              ) : sessionsError ? (
                <p role="alert" className="text-sm text-red">{sessionsError}</p>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-neutral-600">Todavía no hay fechas abiertas. Escríbele a {cls.teacher.name.split(' ')[0]} por WhatsApp o Instagram para preguntar.</p>
              ) : (
                <div className="space-y-5">
                  {byMonth.map(([month, rows]) => (
                    <div key={month}>
                      <p className="text-[13px] font-bold text-neutral-700 first-letter:uppercase mb-2">{month}</p>
                      <div className="grid gap-2">
                        {rows.map(s => {
                          const left = sessionSpotsLeft(s);
                          const full = left === 0;
                          const booked = Boolean(s.alreadyBooked);
                          const disabled = full || booked;
                          const chip = booked
                            ? { text: 'Ya reservada', tone: 'bg-neutral-100 text-neutral-600' }
                            : spotsChip(left);
                          const d = new Date(`${s.date}T12:00:00Z`);
                          const away = daysUntil(s.date, today);
                          const isSel = sessionIds.includes(s.id);
                          return (
                            <button key={s.id} type="button" disabled={disabled} aria-pressed={isSel}
                              onClick={() => toggleSession(s.id)}
                              className={`flex items-center gap-3 text-left p-2.5 rounded-xl border-2 transition-[border-color,background-color] ${
                                disabled ? 'border-neutral-100 bg-neutral-50 opacity-60 cursor-not-allowed'
                                  : isSel ? 'border-primary bg-primary-bg' : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                              }`}>
                              <span className={`w-12 shrink-0 rounded-lg py-1.5 text-center ${isSel ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-900'}`}>
                                <span className="block text-[10px] font-bold leading-none opacity-80">{d.toLocaleDateString('es-PE', { weekday: 'short', timeZone: 'UTC' }).replace('.', '')}</span>
                                <span className="block text-[20px] font-black leading-tight">{d.getUTCDate()}</span>
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-[14px] font-bold text-neutral-900">{s.startTime} – {s.endTime}</span>
                                <span className="block text-[12px] text-neutral-600">{countdownLabel(away)}</span>
                              </span>
                              <span className={`text-[11px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${chip.tone}`}>{chip.text}</span>
                              {!disabled && (
                                <span
                                  aria-hidden="true"
                                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                    isSel ? 'bg-primary border-primary text-white' : 'border-neutral-300 bg-white'
                                  }`}
                                >
                                  {isSel && <Check className="w-3.5 h-3.5" />}
                                </span>
                              )}
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
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-black text-neutral-900">Cuéntanos cómo vienes</h2>
                {isMulti ? (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-xs font-bold text-primary">{selectedSessions.length} fechas seleccionadas</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSessions.map(s => (
                        <span key={s.id} className="text-[11.5px] font-semibold bg-neutral-100 text-neutral-800 px-2.5 py-1 rounded-full first-letter:uppercase">
                          {formatShortSession(s)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : eventDate && (
                  <p className="text-sm text-neutral-600 mt-0.5 first-letter:uppercase">
                    {formatLongDate(eventDate)}{startTime ? ` · ${startTime}` : ''}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3">
                <div>
                  <p className="text-[14px] font-bold text-neutral-900">¿Cuántos van?</p>
                  <p className="text-[12px] text-neutral-600">
                    {spotsLeft != null
                      ? isMulti
                        ? `Hasta ${spotsLeft} cupo${spotsLeft !== 1 ? 's' : ''} (mínimo entre tus fechas)`
                        : spotsLeft === 1 ? 'Queda 1 cupo' : `Quedan ${spotsLeft} cupos`
                      : 'Tú y quien te acompañe'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" aria-label="Menos cupos" disabled={seats <= 1} onClick={() => setSeats(n => n - 1)}
                    className="w-9 h-9 rounded-full border border-neutral-300 flex items-center justify-center disabled:opacity-40"><Minus className="w-4 h-4" /></button>
                  <span className="w-5 text-center font-bold" aria-live="polite">{seats}</span>
                  <button type="button" aria-label="Más cupos" disabled={seats >= maxSeats} onClick={() => setSeats(n => n + 1)}
                    className="w-9 h-9 rounded-full border border-neutral-300 flex items-center justify-center disabled:opacity-40"><Plus className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[14px] font-bold text-neutral-900">
                      Tu contacto <span className="text-red" aria-hidden="true">*</span>
                    </p>
                    <span className={`text-[10.5px] font-bold rounded-full px-2 py-0.5 whitespace-nowrap ${
                      hasContact ? 'bg-green-bg text-green-text' : 'bg-yellow-bg text-yellow-dark'
                    }`}>
                      Mínimo 1
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5" role="group" aria-label="Canales de contacto">
                    <button
                      type="button"
                      aria-pressed={useWa}
                      onClick={() => { setUseWaDraft(!useWa); setContactError(null); }}
                      className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg border-2 text-xs font-bold transition-colors ${
                        useWa
                          ? 'border-[#16a34a] bg-[#16a34a]/10 text-[#15803d]'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      WhatsApp
                      {useWa && <Check className="w-3 h-3 shrink-0" aria-hidden="true" />}
                    </button>
                    <button
                      type="button"
                      aria-pressed={useIg}
                      onClick={() => { setUseIgDraft(!useIg); setContactError(null); }}
                      className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg border-2 text-xs font-bold transition-colors ${
                        useIg
                          ? 'border-primary bg-primary-bg text-primary'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <InstagramIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      Instagram
                      {useIg && <Check className="w-3 h-3 shrink-0" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                {useWa && (
                  <div>
                    <label htmlFor="booking-whatsapp" className="sr-only">
                      WhatsApp
                    </label>
                    <div className="flex gap-2">
                      <PhoneCountrySelect value={waCode} onChange={code => { setWaCodeDraft(code); setContactError(null); }} />
                      <input
                        id="booking-whatsapp"
                        type="tel"
                        inputMode="numeric"
                        value={waNumber}
                        onChange={e => { setWaNumberDraft(e.target.value); setContactError(null); }}
                        placeholder={getPhoneExample(waCode)}
                        aria-invalid={waNumber.trim().length > 0 && !waValidation.valid}
                        className={`input flex-1 !py-2.5 ${
                          waNumber.trim().length > 0 && !waValidation.valid ? '!border-red' : ''
                        }`}
                      />
                    </div>
                    {waNumber.trim().length > 0 && !waValidation.valid && (
                      <p role="alert" className="text-xs font-semibold text-red mt-1">{waValidation.error}</p>
                    )}
                  </div>
                )}

                {useIg && (
                  <div>
                    <label htmlFor="booking-instagram" className="sr-only">
                      Instagram
                    </label>
                    <div className={`flex items-center w-full bg-white border-2 border-neutral-200 rounded-btn transition-[border-color] duration-100 ease-out hover:border-neutral-900 focus-within:!border-primary ${
                      igHandle.trim().length > 0 && !igValidation.valid ? '!border-red' : ''
                    }`}>
                      <span className="pl-3.5 pr-1 text-[15px] text-neutral-400 select-none" aria-hidden="true">@</span>
                      <input
                        id="booking-instagram"
                        type="text"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={igHandle}
                        onChange={e => {
                          const raw = e.target.value;
                          setIgHandleDraft(raw.startsWith('@') ? raw.slice(1) : raw);
                          setContactError(null);
                        }}
                        placeholder="tuusuario (sin enlaces)"
                        aria-invalid={igHandle.trim().length > 0 && !igValidation.valid}
                        className="flex-1 min-w-0 bg-transparent py-2.5 pr-3.5 text-[15px] text-neutral-900 placeholder:text-neutral-400 outline-none"
                      />
                    </div>
                    {igHandle.trim().length > 0 && !igValidation.valid && (
                      <p role="alert" className="text-xs font-semibold text-red mt-1">{igValidation.error}</p>
                    )}
                  </div>
                )}

                {canSaveContactToProfile && (
                  <label className="inline-flex items-center gap-2 text-[12.5px] text-neutral-600 cursor-pointer select-none pt-0.5">
                    <input
                      type="checkbox"
                      checked={saveToProfile}
                      onChange={e => setSaveToProfile(e.target.checked)}
                      className="w-4 h-4 rounded border-neutral-300 accent-primary cursor-pointer"
                    />
                    <span>Guardar en mi perfil para futuras reservas</span>
                  </label>
                )}

                {contactError && <p role="alert" className="text-xs font-semibold text-red">{contactError}</p>}
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
                Compartiremos tu nombre, tu foto, tu mensaje y el contacto que ingreses solo con {cls.teacher.name.split(' ')[0]} para coordinar esta clase. Nunca verá tu correo.
              </p>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-neutral-900">Revisa y confirma</h2>

              <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-200 text-[14px]">
                {isMulti ? (
                  <div className="flex items-start gap-3 p-3">
                    <CalendarCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-neutral-900">{selectedSessions.length} fechas seleccionadas</p>
                      <ul className="mt-1.5 space-y-1">
                        {selectedSessions.map(s => (
                          <li key={s.id} className="text-[12.5px] text-neutral-700 flex items-center justify-between gap-2">
                            <span className="first-letter:uppercase font-medium">{formatLongDate(s.date)}</span>
                            <span className="text-neutral-500 whitespace-nowrap">{s.startTime} – {s.endTime}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11.5px] text-neutral-500 mt-2">
                        Cada fecha quedará guardada como una reserva independiente en «Mis reservas».
                      </p>
                    </div>
                  </div>
                ) : eventDate && (
                  <div className="flex items-start gap-3 p-3">
                    <CalendarCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-bold text-neutral-900 first-letter:uppercase">{formatLongDate(eventDate)}</p>
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
                    <div className="flex justify-between font-bold text-neutral-900 gap-2">
                      <span>
                        {isMulti
                          ? `${seats} cupo${seats !== 1 ? 's' : ''} × ${selectedSessions.length} fechas`
                          : `${seats} cupo${seats !== 1 ? 's' : ''}`}
                      </span>
                      <span>{total === 0 ? 'Gratis' : formatPriceShort('Pago único', total, cls.currency)}</span>
                    </div>
                    <p className="text-[12px] text-neutral-600 mt-0.5">
                      {isOnline
                        ? total === 0
                          ? 'No tienes que pagar nada. Tu cupo se confirma al instante y coordinas el enlace directo con tu profesor.'
                          : 'Hoy no pagas nada aquí. Tu cupo queda apartado mientras coordinas el pago y el enlace de acceso directo con tu profesor para que confirme tu reserva.'
                        : total === 0
                          ? 'No tienes que pagar nada. Tu cupo se confirma al instante.'
                          : 'Hoy no pagas nada aquí. Tu cupo queda apartado mientras coordinas el pago directo con tu profesor para que confirme tu reserva.'}
                    </p>
                  </div>
                </div>
              </div>

              <ClassTips footwear={cls.footwear} clothing={cls.clothing} toBring={cls.toBring} requirements={cls.requirements} teacherName={cls.teacher.name} />

              <p className="text-[12px] text-neutral-600 leading-relaxed">
                {requiresApproval ? (
                  <>
                    <b className="text-neutral-900">Cancelación libre mientras esté pendiente.</b>{' '}
                    Puedes cancelar sin restricción antes de que {cls.teacher.name.split(' ')[0]} confirme tu reserva.
                    Una vez confirmada aplicará la política ({POLICY_HUMAN[policy]}).
                  </>
                ) : canCancelAfterBooking ? (
                  <>
                    <b className="text-neutral-900">¿Cambio de planes? Sin problema.</b>{' '}
                    Puedes cancelar {POLICY_HUMAN[policy]} desde «Mis reservas» y tu cupo queda libre para otra persona.
                    {deadline && (
                      <>
                        {' '}{isMulti ? 'Para la fecha más próxima tienes tiempo' : 'Tienes tiempo'} hasta el {formatDeadlineLima(deadline)} (hora Lima).
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <b className="text-neutral-900">Reserva fuera del plazo de cancelación.</b>{' '}
                    {isMulti
                      ? `La fecha más próxima está dentro del plazo de ${POLICY_HUMAN[policy]}, por lo que esa fecha ya no podrás cancelarla desde Kynea una vez confirmada.`
                      : `Esta clase exige avisar ${POLICY_HUMAN[policy]}, por lo que una vez confirmada ya no podrás cancelarla desde Kynea. Si surge un imprevisto, escríbele directo al profesor.`}
                  </>
                )}
              </p>

              {error && <p role="alert" className="text-sm text-red">{error}</p>}
            </div>
          )}

          {step === 'done' && (
            <div className="text-center">
              <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3 ${
                isDonePending ? 'bg-yellow-bg' : 'bg-green-bg'
              }`}>
                {isDonePending
                  ? <Clock className="w-7 h-7 text-yellow-dark" />
                  : <Check className="w-7 h-7 text-green-text" />}
              </div>
              <h2 className="text-xl font-black text-neutral-900">
                {isDonePending
                  ? isMulti ? `¡Tus ${selectedSessions.length} solicitudes fueron enviadas!` : '¡Solicitud enviada!'
                  : isMulti ? `¡Tus ${selectedSessions.length} reservas están listas!` : '¡Tu cupo está listo!'}
              </h2>
              {timing && (
                <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-bold text-primary bg-primary-bg rounded-full px-3 py-1">
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  {isMulti ? `Próxima: ${timing}` : timing}
                </p>
              )}
              <p className="text-sm text-neutral-600 mt-3">
                {isDonePending
                  ? isMulti
                    ? `Apartamos tus ${selectedSessions.length} fechas como pendientes de confirmación. Escríbele ahora a ${cls.teacher.name.split(' ')[0]} para coordinar el pago${isOnline ? ' y el enlace de acceso' : ''} y asegurar tu lugar.`
                    : `Tu cupo está apartado, pendiente de confirmación por ${cls.teacher.name.split(' ')[0]}. Escríbele ahora para coordinar el pago${isOnline ? ' y el enlace de acceso' : ''} y asegurar tu lugar.`
                  : isMulti
                    ? `${cls.teacher.name.split(' ')[0]} ya sabe que vas a esas ${selectedSessions.length} fechas.${isOnline ? ' Coordinas el enlace de acceso directo con tu profesor.' : ''} Cada una quedó como una reserva independiente en «Mis reservas» y te mandaremos los detalles por correo.`
                    : `${cls.teacher.name.split(' ')[0]} ya sabe que vas.${isOnline ? ' Coordinas el enlace de acceso directo con tu profesor.' : ''} Te mandaremos los detalles por correo.`}
              </p>
              {isDonePending && (teacherChannels.whatsappUrl || teacherChannels.instagramUrl) && (
                <div className="mt-4 rounded-xl bg-neutral-50 border border-neutral-200 p-3.5 space-y-2.5 text-left">
                  <p className="text-[12px] font-bold text-neutral-800 text-center">
                    Escribir al profesor para confirmar
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {teacherChannels.whatsappUrl && (
                      <a
                        href={teacherChannels.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold bg-[#16a34a] text-white hover:opacity-90 transition-opacity"
                      >
                        <WhatsAppIcon className="w-4 h-4" aria-hidden="true" />
                        Escribir por WhatsApp
                      </a>
                    )}
                    {teacherChannels.instagramUrl && (
                      <a
                        href={teacherChannels.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
                      >
                        <InstagramIcon className="w-4 h-4" aria-hidden="true" />
                        {teacherChannels.instagramHandle ? `Instagram (${teacherChannels.instagramHandle})` : 'Escribir por Instagram'}
                      </a>
                    )}
                  </div>
                </div>
              )}
              {isMulti ? (
                <div className="mt-4 text-left space-y-2">
                  <p className="text-[12px] font-bold text-neutral-700 text-center">Guárdalas para no olvidarlas</p>
                  {selectedSessions.map((s, i) => (
                    <div key={s.id} className="rounded-xl border border-neutral-200 p-2.5 flex flex-col gap-2">
                      <p className="text-[12.5px] font-bold text-neutral-900 first-letter:uppercase">
                        {formatLongDate(s.date)} · {s.startTime} – {s.endTime}
                      </p>
                      <AddToCalendar
                        event={buildCalendarEvent(s.date, s.startTime, s.endTime)}
                        uid={bookingIds[i] ?? `${cls.id}-${s.id}`}
                      />
                    </div>
                  ))}
                </div>
              ) : singleEvent && bookingIds[0] && (
                <div className="mt-4 flex flex-col items-center gap-2">
                  <p className="text-[12px] font-bold text-neutral-700">Guárdalo para no olvidarlo</p>
                  <AddToCalendar event={singleEvent} uid={bookingIds[0]} className="justify-center" />
                </div>
              )}
              <div className="mt-5 text-left">
                <ClassTips footwear={cls.footwear} clothing={cls.clothing} toBring={cls.toBring} requirements={cls.requirements} teacherName={cls.teacher.name} />
              </div>
              {mapsHref && (
                <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm inline-flex items-center gap-1.5 mt-4">
                  <MapPin className="w-4 h-4" aria-hidden="true" /> Cómo llegar
                </a>
              )}
            </div>
          )}
        </div>

        {/* Pie fijo con la acción principal */}
        <div className="shrink-0 border-t border-neutral-200 p-4 flex items-center gap-3">
          {step === 'done' ? (
            <Link href="/dashboard/mis-reservas" className="btn-primary w-full py-3.5 text-center">Ver mis reservas</Link>
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
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {requiresApproval
                    ? isMulti ? `Solicitar ${selectedSessions.length} reservas` : 'Solicitar reserva'
                    : isMulti ? `Confirmar ${selectedSessions.length} reservas` : 'Confirmar reserva'}
                </button>
              ) : (
                <button type="button" onClick={() => {
                  if (step === 'details' && !hasContact) {
                    setContactError('Ingresa tu WhatsApp o tu usuario de Instagram para continuar.');
                    return;
                  }
                  setContactError(null);
                  setStep(steps[stepIndex + 1]);
                }}
                  disabled={(step === 'date' && selectedSessions.length === 0) || (step === 'details' && !hasContact)}
                  className="btn-primary flex-1 py-3.5 disabled:opacity-50 disabled:cursor-not-allowed">
                  {step === 'date' && selectedSessions.length === 0
                    ? 'Elige una fecha'
                    : step === 'date' && selectedSessions.length > 1
                      ? `Continuar (${selectedSessions.length} fechas)`
                      : 'Continuar'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
}
