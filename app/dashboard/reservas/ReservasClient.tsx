'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Check,
  ChevronDown,
  Clock,
  MessageSquare,
  RotateCcw,
  UserX,
  X,
} from 'lucide-react';
import { InstagramIcon, WhatsAppIcon } from '@/components/icons/SocialIcons';
import type { TeacherBooking } from '@/lib/bookings/types';
import { bookingStatusLabel } from '@/lib/bookings/rules';
import { buildTeacherToStudentMessage, resolveStudentChannels, type ResolvedContactChannels } from '@/lib/bookings/contact';
import {
  autoCloseCountdown,
  BOOKING_AUTO_CLOSE_HOURS,
  classTimingLabel,
  countdownLabel,
  formatLongDate,
  formatShortDate,
  limaToDate,
  toLimaDateString,
} from '@/lib/bookings/dates';
import { groupTeacherBookings, type BookingGroup } from '@/lib/bookings/grouping';
import {
  setBookingAttendance,
  bulkSetBookingAttendance,
  closeClassAttendance,
  cancelBooking,
  cancelClassSession,
  confirmBooking,
} from '@/lib/bookings/actions';
import { formatPriceShort } from '@/lib/utils';

type Tab = 'upcoming' | 'toClose' | 'history';
type UpcomingFilter = 'all' | 'pending';
type ActionResult = { ok: boolean; error?: { message: string } };

const RELEASE_REASON = 'Cupo liberado por el profesor (sin confirmación)';
const CANCEL_CONFIRM_COPY = '¿Cancelar esta reserva? Se liberará el cupo y el alumno recibirá un correo de aviso.';
const CANCEL_SESSION_COPY = '¿Cancelar esta fecha? Se cancelarán todas las reservas y tus alumnos recibirán un aviso.';

const ROW_BTN_BASE =
  'h-8 px-3 text-[13px] font-semibold rounded-btn inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 transition-colors cursor-pointer';
const ROW_BTN_PRIMARY = `${ROW_BTN_BASE} bg-primary text-white hover:bg-primary-dark`;
const ROW_BTN_NEUTRAL = `${ROW_BTN_BASE} bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100 hover:border-neutral-300`;
const ROW_BTN_CONFIRM_ALT = `${ROW_BTN_BASE} bg-white border border-neutral-300 text-neutral-900 hover:bg-neutral-100`;
const ROW_BTN_DANGER = `${ROW_BTN_BASE} bg-white border border-neutral-200 text-neutral-700 hover:border-red-300 hover:bg-red-50/60 hover:text-red-700`;

function PendingBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 rounded-full px-2 py-0.5 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
      {children}
    </span>
  );
}

function timingBadgeClass(daysAway: number | null): string {
  return daysAway === 0 || daysAway === 1
    ? 'bg-primary-bg/70 text-primary'
    : 'bg-neutral-100 text-neutral-600';
}

function capacityText(taken: number, capacity?: number): string {
  return capacity ? `${taken}/${capacity} cupos` : `${taken} cupo${taken !== 1 ? 's' : ''}`;
}

function capacityPct(taken: number, capacity?: number): number | null {
  return capacity ? Math.min(100, Math.round((taken / capacity) * 100)) : null;
}

function bookingPriceText(b: Pick<TeacherBooking, 'priceAmount' | 'currency' | 'paymentMethod'>): string {
  if (b.paymentMethod === 'free' || b.priceAmount <= 0) return 'Gratis';
  return formatPriceShort('Pago único', b.priceAmount, b.currency);
}

function MessageNoteIcon() {
  return (
    <span
      title="Tiene mensaje del alumno"
      aria-label="Tiene mensaje del alumno"
      className="inline-flex items-center text-neutral-400 shrink-0"
    >
      <MessageSquare className="w-4 h-4" aria-hidden="true" />
    </span>
  );
}

function StudentInlineChannels({
  channels,
  className = 'text-neutral-500',
}: {
  channels: ResolvedContactChannels;
  className?: string;
}) {
  const hasWhatsapp = Boolean(channels.whatsappUrl && channels.whatsappDisplay);
  const hasInstagram = Boolean(channels.instagramUrl && channels.instagramHandle);
  if (!hasWhatsapp && !hasInstagram) return null;
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] ${className}`}>
      {hasWhatsapp && channels.whatsappUrl && channels.whatsappDisplay && (
        <a
          href={channels.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 hover:text-neutral-900 hover:underline transition-colors"
        >
          <WhatsAppIcon className="w-3.5 h-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
          <span>{channels.whatsappDisplay}</span>
        </a>
      )}
      {hasWhatsapp && hasInstagram && (
        <span className="text-neutral-300" aria-hidden="true">·</span>
      )}
      {hasInstagram && channels.instagramUrl && channels.instagramHandle && (
        <a
          href={channels.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 hover:text-neutral-900 hover:underline transition-colors"
        >
          <InstagramIcon className="w-3.5 h-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
          <span>{channels.instagramHandle}</span>
        </a>
      )}
    </span>
  );
}

function isHistoryRowEditable(b: Pick<TeacherBooking, 'status'>): boolean {
  return b.status === 'attended' || b.status === 'no_show' || b.status === 'confirmed';
}

function historyStatusBadgeClass(status: TeacherBooking['status']): string {
  if (status === 'attended') return 'bg-green-bg text-green-text';
  if (status === 'no_show') return 'bg-red-bg text-red-text';
  return 'bg-neutral-100 text-neutral-500';
}

export default function ReservasClient({
  bookings,
  today,
  nowIso,
  isSuperuser = false,
}: {
  bookings: TeacherBooking[];
  today: string;
  nowIso?: string;
  isSuperuser?: boolean;
}) {
  const initialNowIso = nowIso ?? limaToDate(today, '20:00').toISOString();
  const [liveNowIso, setLiveNowIso] = useState<string>(initialNowIso);
  const [liveToday, setLiveToday] = useState<string>(today);
  const [prevServerClock, setPrevServerClock] = useState({ today, nowIso });
  if (prevServerClock.today !== today || prevServerClock.nowIso !== nowIso) {
    setPrevServerClock({ today, nowIso });
    setLiveNowIso(initialNowIso);
    setLiveToday(today);
  }

  useEffect(() => {
    const syncClock = () => {
      const now = new Date();
      setLiveNowIso(now.toISOString());
      setLiveToday(toLimaDateString(now));
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncClock();
    };
    const interval = window.setInterval(syncClock, 60_000);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const effectiveNow = useMemo(() => new Date(liveNowIso), [liveNowIso]);

  const groups = useMemo(
    () => groupTeacherBookings(bookings, liveToday, effectiveNow),
    [bookings, liveToday, effectiveNow],
  );
  const upcomingPendingCount = useMemo(
    () => groups.upcoming.reduce((sum, g) => sum + g.pendingCount, 0),
    [groups.upcoming],
  );

  const [tab, setTab] = useState<Tab>(groups.toClose.length > 0 && groups.upcoming.length === 0 ? 'toClose' : 'upcoming');
  const [upcomingFilter, setUpcomingFilter] = useState<UpcomingFilter>('all');
  const [selectedKeyByTab, setSelectedKeyByTab] = useState<Partial<Record<Tab, string>>>({});
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [editingHistoryKey, setEditingHistoryKey] = useState<string | null>(null);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const effectiveUpcomingFilter: UpcomingFilter =
    upcomingFilter === 'pending' && upcomingPendingCount > 0 ? 'pending' : 'all';

  const visibleList = useMemo(() => {
    if (tab === 'upcoming' && effectiveUpcomingFilter === 'pending') {
      return groups.upcoming.filter(g => g.pendingCount > 0);
    }
    return groups[tab];
  }, [effectiveUpcomingFilter, groups, tab]);

  const selected = useMemo(
    () => visibleList.find(g => g.key === selectedKeyByTab[tab]) ?? visibleList[0] ?? null,
    [selectedKeyByTab, tab, visibleList],
  );

  const isEditingHistory = tab === 'history' && selected !== null && editingHistoryKey === selected.key;

  const run = (id: string, fn: () => Promise<ActionResult>) => {
    setError(null);
    setBusy(id);
    startTransition(async () => {
      try {
        const r = await fn();
        if (!r.ok) setError(r.error?.message ?? 'No se pudo completar la acción.');
      } catch {
        setError('No pudimos completar la acción. Verifica tu sesión e inténtalo de nuevo.');
      } finally {
        setBusy(null);
      }
    });
  };

  const tabs: { id: Tab; label: string; count: number; dot?: boolean }[] = [
    { id: 'upcoming', label: 'Próximas', count: groups.upcoming.length, dot: upcomingPendingCount > 0 },
    { id: 'toClose', label: 'Por cerrar', count: groups.toClose.length, dot: groups.toClose.length > 0 },
    { id: 'history', label: 'Historial', count: groups.history.length },
  ];

  const handleSelectTab = (next: Tab) => {
    setTab(next);
    setMobileDetailOpen(false);
    setExpandedStudentId(null);
    setEditingHistoryKey(null);
    setSelectedHistoryIds([]);
  };

  const handleSelectSession = (key: string) => {
    setSelectedKeyByTab(prev => ({ ...prev, [tab]: key }));
    setMobileDetailOpen(true);
    setExpandedStudentId(null);
    setEditingHistoryKey(null);
    setSelectedHistoryIds([]);
  };

  return (
    <div className="p-6 lg:p-8 w-full max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[28px] font-black text-neutral-900 tracking-tight">
            {isSuperuser ? 'Reservas (vista global)' : 'Reservas recibidas'}
          </h1>
          <p className="text-neutral-600 text-[15px] mt-1">
            {isSuperuser
              ? 'Todas las reservas registradas en la plataforma en modo Superusuario.'
              : 'Confirma solicitudes pendientes, contacta a tus alumnos y gestiona tus cupos.'}
          </p>
        </div>
        {!isSuperuser && (
          <Link
            href="/dashboard/mis-reservas"
            className="btn-outline btn-sm inline-flex items-center gap-1.5 shrink-0"
          >
            Mis reservas como alumno <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-red mb-4">{error}</p>}

      {bookings.length === 0 ? (
        <div className="bg-white card-dash p-12 text-center">
          <CalendarCheck className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="font-bold text-[16px] text-neutral-900 mb-1">Todavía no tienes reservas recibidas</p>
          <p className="text-sm text-neutral-600">Activa «Reservas en Kynea» al crear o editar una clase y tus alumnos podrán apartar su cupo.</p>
        </div>
      ) : (
        <>
          <div role="tablist" className="inline-flex gap-1 mb-6 bg-neutral-100 rounded-xl p-1 overflow-x-auto max-w-full">
            {tabs.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                type="button"
                onClick={() => handleSelectTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  tab === t.id
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <span>{t.label}</span>
                {t.count > 0 && (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 ${
                      tab === t.id
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-200/80 text-neutral-600'
                    }`}
                  >
                    {t.dot && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          tab === t.id ? 'bg-amber-400' : 'bg-amber-500'
                        }`}
                        aria-hidden="true"
                      />
                    )}
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {visibleList.length === 0 ? (
            <p className="text-[15px] text-neutral-600 px-6 py-14 text-center bg-white card-dash">
              {tab === 'toClose'
                ? 'Todo al día: no tienes clases pendientes de cerrar.'
                : 'No hay nada por aquí todavía.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 lg:gap-6 items-stretch">
              {/* Columna izquierda: lista maestra de sesiones */}
              <div
                className={`${
                  mobileDetailOpen ? 'hidden lg:flex' : 'flex'
                } flex-col bg-white card-dash overflow-hidden min-w-0 lg:h-[calc(100dvh-230px)] lg:min-h-[540px] lg:max-h-[760px]`}
              >
                {tab === 'upcoming' && upcomingPendingCount > 0 && (
                  <div
                    role="group"
                    aria-label="Filtrar próximas reservas"
                    className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/70 flex items-center gap-2 flex-wrap shrink-0"
                  >
                    <button
                      type="button"
                      aria-pressed={effectiveUpcomingFilter === 'all'}
                      onClick={() => setUpcomingFilter('all')}
                      className={`h-8 px-3 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                        effectiveUpcomingFilter === 'all'
                          ? 'bg-neutral-900 text-white'
                          : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      aria-pressed={effectiveUpcomingFilter === 'pending'}
                      onClick={() => setUpcomingFilter('pending')}
                      className={`h-8 px-3 rounded-lg text-[13px] font-semibold border inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                        effectiveUpcomingFilter === 'pending'
                          ? 'bg-amber-900 text-white border-amber-900'
                          : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200/70'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          effectiveUpcomingFilter === 'pending' ? 'bg-amber-400' : 'bg-amber-500'
                        }`}
                        aria-hidden="true"
                      />
                      Por confirmar ({upcomingPendingCount})
                    </button>
                  </div>
                )}

                <ul
                  aria-label="Lista de sesiones"
                  className="p-2.5 space-y-1.5 flex-1 min-h-0 overflow-y-auto"
                >
                  {visibleList.map(g => {
                    const active = selected?.key === g.key;
                    const endDate = g.sessionId ? g.date : (g.endDate ?? g.date);
                    const autoClose = tab === 'toClose' && endDate
                      ? autoCloseCountdown(endDate, g.endTime, g.startTime, effectiveNow)
                      : null;
                    return (
                      <li key={g.key}>
                        <button
                          type="button"
                          aria-current={active ? 'true' : undefined}
                          onClick={() => handleSelectSession(g.key)}
                          className={`w-full px-4 py-3.5 rounded-lg text-left transition-colors cursor-pointer ${
                            active
                              ? 'bg-primary-bg/50 ring-1 ring-inset ring-primary/25'
                              : 'hover:bg-neutral-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[13.5px] font-bold text-neutral-900 first-letter:uppercase truncate">
                              {g.date ? formatShortDate(g.date) : 'Sin fecha'}{g.startTime ? ` · ${g.startTime}` : ''}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {g.pendingCount > 0 && <PendingBadge>{g.pendingCount}</PendingBadge>}
                              <span
                                className="inline-flex items-center rounded-full bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 text-[12px] font-semibold text-neutral-600 tabular-nums whitespace-nowrap"
                                aria-label={capacityText(g.taken, g.capacity)}
                              >
                                {g.capacity ? `${g.taken}/${g.capacity}` : `${g.taken}`}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-1.5 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className="text-[13px] text-neutral-600 truncate">{g.classTitle}</p>
                              {g.sessionStatus === 'cancelled' && (
                                <span className="text-[11px] font-semibold text-neutral-500 bg-neutral-200/80 rounded-full px-2 py-0.5 whitespace-nowrap shrink-0">
                                  Cancelada
                                </span>
                              )}
                            </div>
                            {autoClose && (
                              <span
                                title={autoClose.label}
                                className={`inline-flex items-center gap-1 text-[11.5px] font-medium whitespace-nowrap shrink-0 tabular-nums ${
                                  autoClose.urgent ? 'text-amber-700' : 'text-neutral-500'
                                }`}
                              >
                                <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
                                {autoClose.shortLabel}
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Columna derecha: detalle de la sesión seleccionada */}
              <div
                className={`${
                  mobileDetailOpen ? 'flex' : 'hidden lg:flex'
                } flex-col bg-white card-dash overflow-hidden min-w-0 lg:h-[calc(100dvh-230px)] lg:min-h-[540px] lg:max-h-[760px]`}
              >
                {selected && (
                  <SessionDetailPane
                    group={selected}
                    tab={tab}
                    today={liveToday}
                    now={effectiveNow}
                    busy={busy}
                    expandedStudentId={expandedStudentId}
                    setExpandedStudentId={setExpandedStudentId}
                    isEditingHistory={isEditingHistory}
                    selectedHistoryIds={selectedHistoryIds}
                    onStartEditHistory={() => {
                      setEditingHistoryKey(selected.key);
                      setSelectedHistoryIds([]);
                    }}
                    onStopEditHistory={() => {
                      setEditingHistoryKey(null);
                      setSelectedHistoryIds([]);
                    }}
                    onChangeSelectedHistoryIds={setSelectedHistoryIds}
                    onBackMobile={() => setMobileDetailOpen(false)}
                    run={run}
                  />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Panel derecho de detalle de la sesión/clase seleccionada. */
function SessionDetailPane({
  group: g,
  tab,
  today,
  now,
  busy,
  expandedStudentId,
  setExpandedStudentId,
  isEditingHistory,
  selectedHistoryIds,
  onStartEditHistory,
  onStopEditHistory,
  onChangeSelectedHistoryIds,
  onBackMobile,
  run,
}: {
  group: BookingGroup;
  tab: Tab;
  today: string;
  now: Date;
  busy: string | null;
  expandedStudentId: string | null;
  setExpandedStudentId: (id: string | null) => void;
  isEditingHistory: boolean;
  selectedHistoryIds: string[];
  onStartEditHistory: () => void;
  onStopEditHistory: () => void;
  onChangeSelectedHistoryIds: (ids: string[]) => void;
  onBackMobile: () => void;
  run: (id: string, fn: () => Promise<ActionResult>) => void;
}) {
  const isSessionCancelled = g.sessionStatus === 'cancelled';
  const pct = capacityPct(g.taken, g.capacity);
  const timingBadge =
    tab === 'upcoming' && g.date
      ? g.sessionId
        ? countdownLabel(g.daysAway ?? 0)
        : classTimingLabel(g.date, g.endDate, today)
      : null;
  const effectiveEndDate = g.sessionId ? g.date : (g.endDate ?? g.date);
  const autoClose =
    tab === 'toClose' && effectiveEndDate
      ? autoCloseCountdown(effectiveEndDate, g.endTime, g.startTime, now)
      : null;
  const hasEditableHistory = tab === 'history' && g.bookings.some(isHistoryRowEditable);

  return (
    <>
      <header className="px-6 py-5 bg-white border-b border-neutral-100 shrink-0">
        <button
          type="button"
          onClick={onBackMobile}
          className="lg:hidden inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-600 hover:text-neutral-900 mb-3 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Volver a sesiones
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-extrabold text-[18px] text-neutral-900 leading-snug">{g.classTitle}</h2>
              {isSessionCancelled ? (
                <span className="text-[12px] font-semibold text-neutral-500 bg-neutral-200/80 rounded-full px-2.5 py-0.5 whitespace-nowrap">
                  Fecha cancelada
                </span>
              ) : timingBadge && (
                <span className={`text-[12px] font-semibold rounded-full px-2.5 py-0.5 whitespace-nowrap ${timingBadgeClass(g.daysAway)}`}>
                  {timingBadge}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <p className="text-[13px] text-neutral-600 first-letter:uppercase">
                {g.date ? formatLongDate(g.date) : 'Fecha por definir'}
                {g.startTime ? ` · ${g.startTime}` : ''}
                {g.endTime ? `–${g.endTime}` : ''}
              </p>
              {tab === 'upcoming' && g.sessionId && !isSessionCancelled && (
                <>
                  <span className="text-[13px] text-neutral-300" aria-hidden="true">·</span>
                  <button
                    type="button"
                    disabled={busy === g.key}
                    onClick={() => {
                      if (!window.confirm(CANCEL_SESSION_COPY)) return;
                      run(g.key, () => cancelClassSession(g.sessionId!, 'Fecha cancelada por el profesor'));
                    }}
                    className="text-[13px] font-semibold text-red-600 hover:text-red-700 hover:underline whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancelar fecha
                  </button>
                </>
              )}
              {autoClose && (
                <>
                  <span className="text-[13px] text-neutral-300" aria-hidden="true">·</span>
                  <span
                    title={`A las ${BOOKING_AUTO_CLOSE_HOURS} h del fin de la clase, los confirmados pasan a asistieron y las solicitudes sin confirmar se cierran automáticamente.`}
                    className={`inline-flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap tabular-nums ${
                      autoClose.urgent ? 'text-amber-700' : 'text-neutral-500'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    {autoClose.label}
                  </span>
                </>
              )}
              {hasEditableHistory && !isEditingHistory && (
                <>
                  <span className="text-[13px] text-neutral-300" aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={onStartEditHistory}
                    className="text-[13px] font-semibold text-primary hover:text-primary-dark hover:underline whitespace-nowrap transition-colors cursor-pointer"
                  >
                    Corregir asistencia
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 pt-0.5">
            {pct !== null && (
              <div
                className="w-24 h-1.5 rounded-full bg-neutral-200 overflow-hidden shrink-0"
                role="progressbar"
                aria-label="Ocupación de cupos"
                aria-valuenow={g.taken}
                aria-valuemin={0}
                aria-valuemax={g.capacity}
              >
                <div
                  className={`h-full rounded-full transition-[width] ${pct >= 100 ? 'bg-amber-500' : 'bg-primary'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
            <span className="text-[13px] font-semibold text-neutral-700 whitespace-nowrap tabular-nums">
              {capacityText(g.taken, g.capacity)}
            </span>
          </div>
        </div>
      </header>

      {tab === 'upcoming' && (
        <UpcomingDetailBody
          group={g}
          busy={busy}
          expandedStudentId={expandedStudentId}
          setExpandedStudentId={setExpandedStudentId}
          run={run}
        />
      )}

      {tab === 'toClose' && (
        <ToCloseDetailBody
          group={g}
          busy={busy}
          expandedStudentId={expandedStudentId}
          setExpandedStudentId={setExpandedStudentId}
          run={run}
        />
      )}

      {tab === 'history' && (
        <HistoryDetailBody
          group={g}
          busy={busy}
          expandedStudentId={expandedStudentId}
          setExpandedStudentId={setExpandedStudentId}
          isEditing={isEditingHistory}
          selectedIds={selectedHistoryIds}
          onChangeSelectedIds={onChangeSelectedHistoryIds}
          onStopEdit={onStopEditHistory}
          run={run}
        />
      )}
    </>
  );
}

/** Identidad en 2 líneas de la fila de alumno: (1) nombre + acompañantes + ícono de nota; (2) monto · canales de contacto. */
function StudentRowIdentity({
  booking: b,
  isOpen,
  onToggle,
  channels,
  boldName = true,
}: {
  booking: TeacherBooking;
  isOpen: boolean;
  onToggle: () => void;
  channels: ResolvedContactChannels;
  boldName?: boolean;
}) {
  const hasChannels = Boolean(
    (channels.whatsappUrl && channels.whatsappDisplay) ||
    (channels.instagramUrl && channels.instagramHandle),
  );
  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={e => {
            e.stopPropagation();
            onToggle();
          }}
          className="text-left inline-flex items-center gap-2 max-w-full group cursor-pointer"
        >
          <span
            className={`${
              boldName ? 'font-bold' : 'font-semibold'
            } text-[15px] text-neutral-900 group-hover:underline truncate`}
          >
            {b.studentName}
          </span>
          {b.seats > 1 && (
            <span className="text-[12px] font-semibold text-neutral-600 bg-neutral-100 rounded-md px-2 py-0.5 whitespace-nowrap">
              +{b.seats - 1} acompañante{b.seats > 2 ? 's' : ''}
            </span>
          )}
        </button>
        {b.note && <MessageNoteIcon />}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-neutral-500">
        <span className="font-semibold text-neutral-600 tabular-nums whitespace-nowrap">
          {bookingPriceText(b)}
        </span>
        {hasChannels && (
          <>
            <span className="text-neutral-300" aria-hidden="true">·</span>
            <StudentInlineChannels channels={channels} />
          </>
        )}
      </div>
    </div>
  );
}

function formatStudentHistoryWithTeacher(attended: number, noShows: number): string {
  if (attended === 0 && noShows === 0) {
    return 'Sin asistencias previas registradas contigo';
  }
  if (attended > 0 && noShows > 0) {
    return `Historial contigo: ${attended} asistencia${attended !== 1 ? 's' : ''} · ${noShows} inasistencia${noShows !== 1 ? 's' : ''}`;
  }
  if (attended > 0) {
    return `Historial contigo: ${attended} asistencia${attended !== 1 ? 's' : ''} previa${attended !== 1 ? 's' : ''}`;
  }
  return `Historial contigo: 0 asistencias · ${noShows} inasistencia${noShows !== 1 ? 's' : ''}`;
}

/** Detalle desplegable de alumno compartido entre Próximas, Por cerrar e Historial. */
function StudentExpandedMeta({ booking: b }: { booking: TeacherBooking }) {
  const historySummary = formatStudentHistoryWithTeacher(b.priorBookings, b.priorNoShows);

  return (
    <div className="px-6 pb-4 pt-3 space-y-2.5 bg-neutral-50/70 border-t border-neutral-100 animate-fade-in">
      {b.note ? (
        <div className="rounded-lg bg-white border border-neutral-200 px-4 py-3">
          <p className="text-[12px] font-semibold text-neutral-500 mb-1">Mensaje del alumno</p>
          <p className="text-[13.5px] text-neutral-800 leading-relaxed whitespace-pre-line">{b.note}</p>
        </div>
      ) : (
        <p className="text-[13px] text-neutral-400">Sin mensaje adicional.</p>
      )}
      <p className="text-[13px] text-neutral-500 tabular-nums">{historySummary}</p>
    </div>
  );
}

/** Cuerpo de "Próximas": pendientes arriba + confirmados abajo con detalle y "Cancelar reserva" (sin "No vino"). */
function UpcomingDetailBody({
  group: g,
  busy,
  expandedStudentId,
  setExpandedStudentId,
  run,
}: {
  group: BookingGroup;
  busy: string | null;
  expandedStudentId: string | null;
  setExpandedStudentId: (id: string | null) => void;
  run: (id: string, fn: () => Promise<ActionResult>) => void;
}) {
  const pending = g.bookings.filter(b => b.status === 'pending_confirmation');
  const confirmed = g.bookings.filter(b => b.status === 'confirmed');
  const others = g.bookings.filter(b => b.status !== 'pending_confirmation' && b.status !== 'confirmed');

  const handleConfirm = (b: TeacherBooking) => {
    run(b.id, () => confirmBooking(b.id));
  };

  const handleRelease = (b: TeacherBooking) => {
    if (!window.confirm(`¿Liberar el cupo de ${b.studentName}? Se cancelará su solicitud y recibirá un aviso.`)) return;
    run(b.id, () => cancelBooking(b.id, RELEASE_REASON));
  };

  const handleCancelConfirmed = (b: TeacherBooking) => {
    if (!window.confirm(CANCEL_CONFIRM_COPY)) return;
    run(b.id, () => cancelBooking(b.id, 'Cancelada por el profesor'));
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {pending.length > 0 && (
        <div role="region" aria-label="Por confirmar" className="border-l-[3px] border-l-amber-400 bg-amber-50/20">
          <div className="px-6 py-3 bg-amber-bg/90 border-b border-amber-200/80">
            <p className="inline-flex items-center gap-2 text-[13px] font-bold text-amber-900">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
              Por confirmar ({pending.length})
            </p>
          </div>
          <ul className="divide-y divide-amber-200/60">
            {pending.map(b => {
              const isOpen = expandedStudentId === b.id;
              const toggle = () => setExpandedStudentId(isOpen ? null : b.id);
              const waMsg = buildTeacherToStudentMessage({
                studentName: b.studentName,
                classTitle: b.classTitle,
                date: b.sessionDate,
                confirmed: false,
              });
              const channels = resolveStudentChannels({
                whatsapp: b.studentWhatsapp,
                instagram: b.studentInstagram,
                message: waMsg,
              });
              return (
                <li key={b.id}>
                  <div
                    onClick={toggle}
                    className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 hover:bg-amber-50/40 transition-colors cursor-pointer"
                  >
                    <StudentRowIdentity booking={b} isOpen={isOpen} onToggle={toggle} channels={channels} />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={busy === b.id}
                        onClick={e => {
                          e.stopPropagation();
                          handleConfirm(b);
                        }}
                        className={ROW_BTN_PRIMARY}
                      >
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />Confirmar
                      </button>
                      <button
                        type="button"
                        disabled={busy === b.id}
                        aria-label={`Liberar cupo de ${b.studentName}`}
                        onClick={e => {
                          e.stopPropagation();
                          handleRelease(b);
                        }}
                        className={ROW_BTN_DANGER}
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />Liberar
                      </button>
                      <ChevronDown
                        className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                  {isOpen && <StudentExpandedMeta booking={b} />}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {confirmed.length > 0 && (
        <div role="region" aria-label="Confirmados" className={pending.length > 0 ? 'border-t border-neutral-200' : ''}>
          <div className="px-6 py-3 bg-neutral-50/80 border-b border-neutral-100">
            <p className="text-[13px] font-bold text-neutral-700">Confirmados ({confirmed.length})</p>
          </div>
          <ul className="divide-y divide-neutral-100">
            {confirmed.map(b => {
              const isOpen = expandedStudentId === b.id;
              const toggle = () => setExpandedStudentId(isOpen ? null : b.id);
              const waMsg = buildTeacherToStudentMessage({
                studentName: b.studentName,
                classTitle: b.classTitle,
                date: b.sessionDate,
                confirmed: true,
              });
              const channels = resolveStudentChannels({
                whatsapp: b.studentWhatsapp,
                instagram: b.studentInstagram,
                message: waMsg,
              });
              return (
                <li key={b.id}>
                  <div
                    onClick={toggle}
                    className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 hover:bg-neutral-50/80 transition-colors cursor-pointer"
                  >
                    <StudentRowIdentity booking={b} isOpen={isOpen} onToggle={toggle} channels={channels} boldName={false} />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={busy === b.id}
                        onClick={e => {
                          e.stopPropagation();
                          handleCancelConfirmed(b);
                        }}
                        className="h-8 px-3 text-[13px] font-medium rounded-btn border border-neutral-200 bg-white text-neutral-700 hover:border-red-300 hover:bg-red-50/50 hover:text-red-700 inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />Cancelar reserva
                      </button>
                      <ChevronDown
                        className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                  {isOpen && <StudentExpandedMeta booking={b} />}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {others.length > 0 && (
        <ul className="divide-y divide-neutral-100 border-t border-neutral-100">
          {others.map(b => (
            <li key={b.id} className="px-6 py-3 flex items-center justify-between gap-3 opacity-60">
              <span className="text-[14px] text-neutral-700 truncate">{b.studentName}</span>
              <span className="text-[13px] text-neutral-500 whitespace-nowrap">{bookingStatusLabel(b.status)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Cuerpo de "Por cerrar": 2 secciones claras (no confirmados + confirmados) y cierre masivo 1-clic. */
function ToCloseDetailBody({
  group: g,
  busy,
  expandedStudentId,
  setExpandedStudentId,
  run,
}: {
  group: BookingGroup;
  busy: string | null;
  expandedStudentId: string | null;
  setExpandedStudentId: (id: string | null) => void;
  run: (id: string, fn: () => Promise<ActionResult>) => void;
}) {
  const pendingList = g.bookings.filter(b => b.status === 'pending_confirmation');
  const confirmedList = g.bookings
    .filter(b => b.status === 'confirmed' || b.status === 'no_show')
    .sort((a, b) => (a.status === 'confirmed' ? 0 : 1) - (b.status === 'confirmed' ? 0 : 1));
  const otherList = g.bookings.filter(
    b => b.status !== 'pending_confirmation' && b.status !== 'confirmed' && b.status !== 'no_show',
  );
  const confirmedCount = confirmedList.filter(b => b.status === 'confirmed').length;

  const setStatus = (b: TeacherBooking, status: 'confirmed' | 'no_show') => {
    run(b.id, () => setBookingAttendance(b.id, status));
  };

  const confirmPending = (b: TeacherBooking) => {
    run(b.id, () => confirmBooking(b.id));
  };

  const releasePending = (b: TeacherBooking) => {
    if (!window.confirm(`¿Liberar el cupo de ${b.studentName}? Se cancelará su solicitud y recibirá un aviso.`)) return;
    run(b.id, () => cancelBooking(b.id, RELEASE_REASON));
  };

  const closeRemaining = () => {
    run(g.key, () => closeClassAttendance(g.classId, g.sessionId ?? null));
  };

  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {pendingList.length > 0 && (
        <div
          role="region"
          aria-label="Solicitudes que no llegaron a confirmar"
          className="bg-amber-50/20 border-l-[3px] border-l-amber-400"
        >
          <div className="px-6 py-3 bg-amber-bg/90 border-b border-amber-200/80">
            <p className="inline-flex items-center gap-2 text-[13px] font-bold text-amber-900">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
              Solicitudes que no llegaron a confirmar ({pendingList.length})
            </p>
          </div>
          <ul className="divide-y divide-amber-200/60">
            {pendingList.map(b => {
              const isOpen = expandedStudentId === b.id;
              const toggle = () => setExpandedStudentId(isOpen ? null : b.id);
              const waMsg = buildTeacherToStudentMessage({
                studentName: b.studentName,
                classTitle: b.classTitle,
                date: b.sessionDate,
                confirmed: false,
              });
              const channels = resolveStudentChannels({
                whatsapp: b.studentWhatsapp,
                instagram: b.studentInstagram,
                message: waMsg,
              });
              return (
                <li key={b.id}>
                  <div
                    onClick={toggle}
                    className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 hover:bg-amber-50/40 transition-colors cursor-pointer"
                  >
                    <StudentRowIdentity booking={b} isOpen={isOpen} onToggle={toggle} channels={channels} />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={busy === b.id}
                        onClick={e => {
                          e.stopPropagation();
                          confirmPending(b);
                        }}
                        className={ROW_BTN_CONFIRM_ALT}
                      >
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />Confirmar
                      </button>
                      <button
                        type="button"
                        disabled={busy === b.id}
                        aria-label={`Liberar cupo de ${b.studentName}`}
                        onClick={e => {
                          e.stopPropagation();
                          releasePending(b);
                        }}
                        className={ROW_BTN_DANGER}
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />Liberar
                      </button>
                      <ChevronDown
                        className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                  {isOpen && <StudentExpandedMeta booking={b} />}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {confirmedList.length > 0 && (
        <div
          role="region"
          aria-label="Confirmados · Asistencia"
          className={pendingList.length > 0 ? 'border-t border-neutral-200' : ''}
        >
          <div className="px-6 py-3 bg-neutral-50/80 border-b border-neutral-100 flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[13px] font-bold text-neutral-800">
              Confirmados · Asistencia ({confirmedList.length})
            </p>
            <span className="text-[12px] text-neutral-500">Marca solo si alguien no vino</span>
          </div>
          <ul className="divide-y divide-neutral-100">
            {confirmedList.map(b => {
              const isOpen = expandedStudentId === b.id;
              const toggle = () => setExpandedStudentId(isOpen ? null : b.id);
              const isConfirmed = b.status === 'confirmed';
              const isNoShow = b.status === 'no_show';
              const waMsg = buildTeacherToStudentMessage({
                studentName: b.studentName,
                classTitle: b.classTitle,
                date: b.sessionDate,
                confirmed: true,
              });
              const channels = resolveStudentChannels({
                whatsapp: b.studentWhatsapp,
                instagram: b.studentInstagram,
                message: waMsg,
              });
              return (
                <li key={b.id}>
                  <div
                    onClick={toggle}
                    className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 hover:bg-neutral-50/80 transition-colors cursor-pointer"
                  >
                    <StudentRowIdentity booking={b} isOpen={isOpen} onToggle={toggle} channels={channels} />
                    <div className="flex items-center gap-2 shrink-0">
                      {isConfirmed && (
                        <button
                          type="button"
                          disabled={busy === b.id}
                          onClick={e => {
                            e.stopPropagation();
                            setStatus(b, 'no_show');
                          }}
                          className={ROW_BTN_NEUTRAL}
                        >
                          <UserX className="w-3.5 h-3.5" aria-hidden="true" />No vino
                        </button>
                      )}
                      {isNoShow && (
                        <>
                          <span className="text-[13px] font-medium text-neutral-500 whitespace-nowrap">No asistió</span>
                          <button
                            type="button"
                            disabled={busy === b.id}
                            onClick={e => {
                              e.stopPropagation();
                              setStatus(b, 'confirmed');
                            }}
                            className={ROW_BTN_NEUTRAL}
                          >
                            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />Deshacer
                          </button>
                        </>
                      )}
                      <ChevronDown
                        className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                  {isOpen && <StudentExpandedMeta booking={b} />}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {otherList.length > 0 && (
        <ul className="divide-y divide-neutral-100 border-t border-neutral-200">
          {otherList.map(b => (
            <li key={b.id} className="px-6 py-3 flex items-center justify-between gap-3 opacity-60">
              <span className="font-medium text-[14px] text-neutral-700 truncate">{b.studentName}</span>
              <span className="text-[13px] text-neutral-500 whitespace-nowrap">{bookingStatusLabel(b.status)}</span>
            </li>
          ))}
        </ul>
      )}
      </div>

      {confirmedCount > 0 && (
        <div className="px-6 py-4 bg-neutral-50/70 border-t border-neutral-100 flex items-center justify-end shrink-0">
          <button
            type="button"
            disabled={busy === g.key}
            onClick={closeRemaining}
            className="h-9 px-4 text-[13px] sm:text-[14px] font-semibold rounded-btn bg-primary text-white hover:bg-primary-dark w-full sm:w-auto inline-flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            Confirmar que los demás asistieron ({confirmedCount})
          </button>
        </div>
      )}
    </>
  );
}

/** Cuerpo de "Historial": solo lectura por defecto; al activar "Corregir asistencia" habilita checkboxes masivos y botones individuales. */
function HistoryDetailBody({
  group: g,
  busy,
  expandedStudentId,
  setExpandedStudentId,
  isEditing,
  selectedIds,
  onChangeSelectedIds,
  onStopEdit,
  run,
}: {
  group: BookingGroup;
  busy: string | null;
  expandedStudentId: string | null;
  setExpandedStudentId: (id: string | null) => void;
  isEditing: boolean;
  selectedIds: string[];
  onChangeSelectedIds: (ids: string[]) => void;
  onStopEdit: () => void;
  run: (id: string, fn: () => Promise<ActionResult>) => void;
}) {
  const editableIds = g.bookings.filter(isHistoryRowEditable).map(b => b.id);
  const editableSet = new Set(editableIds);
  const validSelectedIds = selectedIds.filter(id => editableSet.has(id));
  const allSelected = editableIds.length > 0 && validSelectedIds.length === editableIds.length;

  const toggleSelectAll = () => {
    onChangeSelectedIds(allSelected ? [] : editableIds);
  };

  const toggleSelectOne = (bookingId: string) => {
    if (validSelectedIds.includes(bookingId)) {
      onChangeSelectedIds(validSelectedIds.filter(id => id !== bookingId));
    } else {
      onChangeSelectedIds([...validSelectedIds, bookingId]);
    }
  };

  const setAttendance = (b: TeacherBooking, status: 'attended' | 'no_show') => {
    run(b.id, () => setBookingAttendance(b.id, status));
  };

  const handleBulkSet = (status: 'attended' | 'no_show') => {
    if (validSelectedIds.length === 0) return;
    const targetIds = [...validSelectedIds];
    run('bulk-history', async () => {
      const r = await bulkSetBookingAttendance(targetIds, status);
      if (r.ok) onChangeSelectedIds([]);
      return r;
    });
  };

  return (
    <>
      {isEditing && (
        <div className="px-6 py-3 bg-neutral-50/80 border-b border-neutral-100 flex items-center justify-between gap-3 shrink-0">
          <label className="inline-flex items-center gap-2.5 text-[13px] font-semibold text-neutral-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-neutral-300 text-primary accent-primary cursor-pointer"
            />
            Seleccionar todos ({editableIds.length})
          </label>
          <button
            type="button"
            onClick={onStopEdit}
            className={ROW_BTN_NEUTRAL}
          >
            Cancelar
          </button>
        </div>
      )}

      <ul className="divide-y divide-neutral-100 flex-1 min-h-0 overflow-y-auto">
        {g.bookings.map(b => {
          const isOpen = expandedStudentId === b.id;
          const toggle = () => setExpandedStudentId(isOpen ? null : b.id);
          const editable = isHistoryRowEditable(b);
          const inactive = b.status === 'cancelled' || b.status === 'expired';
          const isSelected = editable && validSelectedIds.includes(b.id);
          const waMsg = buildTeacherToStudentMessage({
            studentName: b.studentName,
            classTitle: b.classTitle,
            date: b.sessionDate,
            confirmed: true,
          });
          const channels = resolveStudentChannels({
            whatsapp: b.studentWhatsapp,
            instagram: b.studentInstagram,
            message: waMsg,
          });
          return (
            <li key={b.id} className={inactive ? 'opacity-55' : ''}>
              <div
                onClick={toggle}
                className={`px-6 py-4 flex flex-wrap items-center justify-between gap-3 transition-colors cursor-pointer ${
                  isSelected ? 'bg-primary-bg/25 hover:bg-primary-bg/35' : 'hover:bg-neutral-50/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {isEditing && editable && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      aria-label={`Seleccionar a ${b.studentName}`}
                      onClick={e => e.stopPropagation()}
                      onChange={() => toggleSelectOne(b.id)}
                      className="w-4 h-4 rounded border-neutral-300 text-primary accent-primary cursor-pointer shrink-0"
                    />
                  )}
                  <StudentRowIdentity booking={b} isOpen={isOpen} onToggle={toggle} channels={channels} />
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    className={`text-[12px] font-semibold rounded-full px-2.5 py-0.5 whitespace-nowrap ${historyStatusBadgeClass(b.status)}`}
                  >
                    {bookingStatusLabel(b.status)}
                  </span>
                  {isEditing && (b.status === 'attended' || b.status === 'confirmed') && (
                    <button
                      type="button"
                      disabled={busy === b.id || busy === 'bulk-history'}
                      onClick={e => {
                        e.stopPropagation();
                        setAttendance(b, 'no_show');
                      }}
                      className={ROW_BTN_NEUTRAL}
                    >
                      <UserX className="w-3.5 h-3.5" aria-hidden="true" />No vino
                    </button>
                  )}
                  {isEditing && b.status === 'no_show' && (
                    <button
                      type="button"
                      disabled={busy === b.id || busy === 'bulk-history'}
                      onClick={e => {
                        e.stopPropagation();
                        setAttendance(b, 'attended');
                      }}
                      className={ROW_BTN_NEUTRAL}
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />Deshacer
                    </button>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </div>
              </div>
              {isOpen && <StudentExpandedMeta booking={b} />}
            </li>
          );
        })}
      </ul>

      {isEditing && validSelectedIds.length > 0 && (
        <div
          role="region"
          aria-label="Acciones masivas de asistencia"
          className="px-6 py-3.5 bg-neutral-50/90 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3 shrink-0"
        >
          <span className="text-[13px] font-semibold text-neutral-700 tabular-nums">
            {validSelectedIds.length} seleccionada{validSelectedIds.length !== 1 ? 's' : ''}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy === 'bulk-history'}
              onClick={() => handleBulkSet('attended')}
              className={ROW_BTN_PRIMARY}
            >
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              Marcar asistieron
            </button>
            <button
              type="button"
              disabled={busy === 'bulk-history'}
              onClick={() => handleBulkSet('no_show')}
              className={ROW_BTN_NEUTRAL}
            >
              <UserX className="w-3.5 h-3.5" aria-hidden="true" />
              Marcar no asistieron
            </button>
          </div>
        </div>
      )}
    </>
  );
}
