'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarCheck, CalendarDays, ChevronDown, List, MapPin } from 'lucide-react';
import SmartImage from '@/components/SmartImage';
import { InstagramIcon, WhatsAppIcon } from '@/components/icons/SocialIcons';
import ClassTips from '@/components/booking/ClassTips';
import AddToCalendar from '@/components/booking/AddToCalendar';
import BookingsCalendar from '@/components/booking/BookingsCalendar';
import type { ClassType } from '@/lib/types';
import type { MyBooking } from '@/lib/bookings/types';
import { buildStudentToTeacherMessage, resolveTeacherChannels } from '@/lib/bookings/contact';
import { bookingStatusLabel, isActiveBookingStatus } from '@/lib/bookings/rules';
import {
  cancellationDeadline,
  canStillCancel,
  classTimingLabel,
  countdownLabel,
  daysUntil,
  formatDeadlineLima,
  formatLongDate,
} from '@/lib/bookings/dates';
import { cancelBooking } from '@/lib/bookings/actions';
import { classUrl } from '@/lib/classes/helpers';
import { formatPriceShort } from '@/lib/utils';

function details(b: MyBooking) {
  return {
    date: b.session?.date ?? b.class.startDate,
    start: b.session?.startTime ?? b.class.startTime,
    end: b.session?.endTime ?? b.class.endTime,
  };
}

export default function MisReservasClient({
  bookings,
  today,
  showReceivedLink = false,
}: {
  bookings: MyBooking[];
  today: string;
  showReceivedLink?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [, startTransition] = useTransition();

  const cancel = (id: string) => {
    if (!window.confirm('¿Seguro que quieres cancelar? Tu cupo quedará libre para otra persona.')) return;
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      try {
        const r = await cancelBooking(id);
        if (!r.ok) setError(r.error.message);
      } catch {
        setError('No pudimos cancelar tu reserva. Verifica tu sesión e inténtalo de nuevo.');
      } finally {
        setPendingId(null);
      }
    });
  };

  const isUpcoming = (b: MyBooking) => {
    const { date } = details(b);
    // Una clase completa que ya empezó sigue vigente hasta su fecha de fin.
    const last = b.session ? date : (b.class.endDate ?? date);
    return isActiveBookingStatus(b.status) && (!last || daysUntil(last, today) >= 0);
  };
  const upcoming = bookings.filter(isUpcoming).sort((a, b) => (details(a).date ?? '9999').localeCompare(details(b).date ?? '9999'));
  const past = bookings.filter(b => !isUpcoming(b));

  const renderCard = (b: MyBooking, isNext: boolean) => {
    const { date, start, end } = details(b);
    const away = date ? daysUntil(date, today) : null;
    const timing = !date ? null : b.session ? countdownLabel(daysUntil(date, today)) : classTimingLabel(date, b.class.endDate, today);
    const active = isUpcoming(b);
    const isOpen = open === b.id;
    const isPendingConfirmation = b.status === 'pending_confirmation';
    const isOnline = b.class.modality === 'Online';
    const place = isOnline ? 'Clase online' : [b.class.venueName, b.class.address].filter(Boolean).join(', ');
    const policy = b.class.cancellationPolicy;
    const cancellable = active && (isPendingConfirmation || (date ? canStillCancel(date, start, policy) : true));
    const deadline = date ? cancellationDeadline(date, start, policy) : null;
    const teacherMsg = buildStudentToTeacherMessage({
      teacherName: b.class.teacherName,
      classTitle: b.class.title,
      date,
      seats: b.seats,
    });
    const teacherChannels = resolveTeacherChannels({
      contactMode: b.class.contactMode,
      whatsapp: b.class.teacherWhatsapp,
      instagram: b.class.teacherInstagram,
      showWhatsapp: b.class.teacherShowWhatsapp,
      message: teacherMsg,
    });
    const event = date && start && end
      ? { title: b.class.title, date, startTime: start, endTime: end, location: place || undefined }
      : null;
    const detailHref = b.class.styleSlug && b.class.type && b.class.slug
      ? classUrl({ styleSlug: b.class.styleSlug, type: b.class.type as ClassType, slug: b.class.slug })
      : null;
    const formattedPrice = b.priceAmount > 0
      ? formatPriceShort('Pago único', b.priceAmount, b.currency)
      : 'Gratis';
    const priceLabel = b.priceAmount > 0 && active && isPendingConfirmation
      ? `${formattedPrice} (coordinas el pago con el profesor)`
      : formattedPrice;

    return (
      <article key={b.id} className={`card-dash overflow-hidden ${isPendingConfirmation && active ? 'border-yellow-dark/40' : isNext ? 'border-primary/40 shadow-md' : ''}`}>
        <div className="flex gap-3.5 p-3.5">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-neutral-100 shrink-0">
            {b.class.coverImage && <SmartImage src={b.class.coverImage} alt="" fill sizes="96px" className="object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              {detailHref ? (
                <Link href={detailHref} className="font-extrabold text-neutral-900 leading-tight line-clamp-2 hover:text-primary transition-colors">
                  {b.class.title}
                </Link>
              ) : (
                <p className="font-extrabold text-neutral-900 leading-tight line-clamp-2">{b.class.title}</p>
              )}
              <div className="flex flex-wrap items-center justify-end gap-1.5 max-w-[55%] sm:max-w-none shrink-0">
                {active && timing && (
                  <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 whitespace-nowrap ${away !== null && away >= 0 && away <= 1 ? 'bg-primary text-white' : 'bg-primary-bg text-primary'}`}>
                    {timing}
                  </span>
                )}
                <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 whitespace-nowrap ${
                  active && isPendingConfirmation
                    ? 'bg-yellow-bg text-yellow-dark'
                    : active && b.status === 'confirmed'
                      ? 'bg-green-bg text-green-text'
                      : 'bg-neutral-100 text-neutral-600'
                }`}>
                  {!active && b.status === 'confirmed' ? 'Finalizada' : bookingStatusLabel(b.status)}
                </span>
              </div>
            </div>
            {b.class.teacherName && <p className="text-[12px] text-neutral-600 mt-0.5">con {b.class.teacherName}</p>}
            {date && (
              <p className="text-[13px] font-semibold text-neutral-800 mt-1.5 first-letter:uppercase">
                {formatLongDate(date)}{start ? ` · ${start}${end ? ` – ${end}` : ''}` : ''}
              </p>
            )}
            {place && <p className="text-[12px] text-neutral-500 flex items-center gap-1 mt-0.5 truncate"><MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />{place}</p>}
            <p className="text-[12px] text-neutral-500 mt-0.5">
              {b.seats} cupo{b.seats !== 1 ? 's' : ''} · {priceLabel}
            </p>
          </div>
        </div>

        {active && isPendingConfirmation && (teacherChannels.whatsappUrl || teacherChannels.instagramUrl) && (
          <div className="px-4 py-3 bg-yellow-bg/40 border-t border-yellow-dark/15 flex flex-wrap items-center justify-between gap-2.5">
            <p className="text-[12px] font-semibold text-neutral-800">
              Tu cupo está apartado. Escríbele al profesor para coordinar el pago y confirmarlo:
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {teacherChannels.whatsappUrl && (
                <a
                  href={teacherChannels.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-[#16a34a] text-white hover:opacity-90 transition-opacity"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  Escribir por WhatsApp
                </a>
              )}
              {teacherChannels.instagramUrl && (
                <a
                  href={teacherChannels.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
                >
                  <InstagramIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  {teacherChannels.instagramHandle ? `Instagram (${teacherChannels.instagramHandle})` : 'Escribir por Instagram'}
                </a>
              )}
            </div>
          </div>
        )}

        {active && (
          <>
            <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : b.id)}
              className="w-full flex items-center justify-between px-4 py-2.5 border-t border-neutral-100 text-[13px] font-bold text-primary hover:bg-neutral-50 transition-colors">
              {isOpen ? 'Ocultar detalles' : isOnline ? 'Cómo prepararme' : 'Cómo prepararme y llegar'}
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {isOpen && (
              <div className="p-4 pt-3 space-y-4 border-t border-neutral-100 animate-fade-in">
                <ClassTips footwear={b.class.footwear} clothing={b.class.clothing} toBring={b.class.toBring} requirements={b.class.requirements} teacherName={b.class.teacherName} />
                {isOnline && (
                  <p className="text-[13px] text-neutral-700">
                    Coordinas el enlace de acceso directamente con tu profesor antes de la clase.
                  </p>
                )}
                {!isOnline && b.class.reference && <p className="text-[13px] text-neutral-700"><b>Referencia:</b> {b.class.reference}</p>}
                {b.note && <p className="text-[13px] text-neutral-600"><b className="text-neutral-800">Tu mensaje:</b> {b.note}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  {!isOnline && b.class.mapsUrl && (
                    <a href={b.class.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm inline-flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" aria-hidden="true" /> Cómo llegar
                    </a>
                  )}
                  {event && <AddToCalendar event={event} uid={b.id} />}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <p className="text-[12px] text-neutral-600 max-w-sm">
                    {isPendingConfirmation
                      ? <>Puedes cancelar esta solicitud gratis en cualquier momento mientras esté pendiente de confirmación.</>
                      : cancellable
                        ? deadline
                          ? <>Puedes cancelar sin problema hasta el {formatDeadlineLima(deadline)} (hora Lima).</>
                          : <>Puedes cancelar esta reserva desde aquí si cambias de planes.</>
                        : <>El plazo para cancelar ya pasó. Si no puedes ir, avísale a tu profesor para que pueda ofrecer tu cupo.</>}
                  </p>
                  {cancellable && (
                    <button type="button" onClick={() => cancel(b.id)} disabled={pendingId === b.id}
                      className="text-[13px] font-semibold text-red hover:underline disabled:opacity-50">
                      {pendingId === b.id
                        ? 'Cancelando…'
                        : isPendingConfirmation ? 'Cancelar solicitud' : 'Cancelar reserva'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </article>
    );
  };

  return (
    <div className="p-6 lg:p-8 w-full max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[28px] font-black text-neutral-900 tracking-tight">Mis reservas</h1>
          <p className="text-neutral-600 text-[15px] mt-1">Tus clases reservadas, su estado de confirmación y los detalles para prepararte.</p>
        </div>
        {showReceivedLink && (
          <Link
            href="/dashboard/reservas"
            className="btn-outline btn-sm inline-flex items-center gap-1.5 shrink-0"
          >
            Reservas recibidas <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
      {bookings.length > 0 && (
        <div role="tablist" aria-label="Vista" className="inline-flex rounded-xl bg-neutral-100 p-1 mb-6">
          {([['list', 'Lista', List], ['calendar', 'Calendario', CalendarDays]] as const).map(([id, label, Icon]) => (
            <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[14px] font-bold transition-colors ${
                view === id ? 'bg-white text-primary shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
              }`}>
              <Icon className="w-4 h-4" aria-hidden="true" />{label}
            </button>
          ))}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red mb-4">{error}</p>}

      {bookings.length === 0 ? (
        <div className="card-muted p-10 text-center">
          <CalendarCheck className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="font-semibold text-neutral-700 mb-1">Aún no tienes reservas</p>
          <p className="text-sm text-neutral-600 mb-5">Busca una clase que te guste y presiona «Reservar».</p>
          <Link href="/clases" className="btn-primary btn-sm inline-flex">Explorar clases</Link>
        </div>
      ) : view === 'calendar' ? (
        <BookingsCalendar bookings={bookings} today={today} />
      ) : (
        <>
          <section className="space-y-4 mb-10">
            <h2 className="text-[17px] font-bold text-neutral-900">Próximas</h2>
            {upcoming.length === 0
              ? <p className="text-sm text-neutral-600">No tienes clases próximas. <Link href="/clases" className="text-primary font-semibold hover:underline">Busca tu siguiente clase</Link>.</p>
              : upcoming.map((b, i) => renderCard(b, i === 0))}
          </section>
          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-[17px] font-bold text-neutral-900">Historial</h2>
              {past.map(b => renderCard(b, false))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
