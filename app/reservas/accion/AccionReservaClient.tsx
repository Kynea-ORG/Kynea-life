'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { CalendarCheck, Check, CheckCircle2, Clock, Loader2, MessageSquareText, X, XCircle } from 'lucide-react';
import { InstagramIcon, WhatsAppIcon } from '@/components/icons/SocialIcons';
import { formatLongDate } from '@/lib/bookings/dates';
import { bookingStatusLabel } from '@/lib/bookings/rules';
import { buildTeacherToStudentMessage, resolveStudentChannels } from '@/lib/bookings/contact';
import type { ActionTokenBookingView } from '@/lib/bookings/tokens';
import type { BookingStatus } from '@/lib/bookings/types';
import { formatPriceShort } from '@/lib/utils';
import { submitBookingTokenAction } from './actions';

export default function AccionReservaClient({
  token,
  booking,
  initialUsed,
}: {
  token: string;
  booking: ActionTokenBookingView;
  initialUsed: boolean;
}) {
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [outcome, setOutcome] = useState<'confirmed' | 'released' | 'already_resolved' | null>(
    initialUsed || booking.status !== 'pending_confirmation' ? 'already_resolved' : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmingRelease, setConfirmingRelease] = useState(false);
  const [isPending, startTransition] = useTransition();

  const waMsg = buildTeacherToStudentMessage({
    studentName: booking.studentName,
    classTitle: booking.classTitle,
    date: booking.date,
    confirmed: status === 'confirmed',
  });
  const studentChannels = resolveStudentChannels({
    whatsapp: booking.studentWhatsapp,
    instagram: booking.studentInstagram,
    message: waMsg,
  });

  const handleDecision = (decision: 'confirm' | 'release') => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await submitBookingTokenAction(token, decision);
        if (!res.ok) {
          setError(res.message);
          return;
        }
        setStatus(res.currentStatus);
        setOutcome(res.outcome);
        setConfirmingRelease(false);
      } catch {
        setError('No pudimos procesar tu acción. Inténtalo de nuevo o entra a tu panel.');
      }
    });
  };

  const priceLabel = booking.priceAmount > 0
    ? formatPriceShort('Pago único', booking.priceAmount, booking.currency)
    : 'Gratis';

  const canAct = status === 'pending_confirmation' && outcome === null;

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="bg-primary px-6 py-4 text-white">
        <p className="text-xs font-bold uppercase tracking-wider opacity-85">Kynea · Gestión de reserva</p>
        <h1 className="text-xl font-black mt-0.5 leading-tight">{booking.classTitle}</h1>
      </div>

      <div className="p-6 space-y-5">
        {outcome === 'confirmed' && (
          <div className="rounded-xl bg-green-bg border border-green-text/20 p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-text shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-bold text-green-text text-sm">¡Reserva confirmada!</p>
              <p className="text-xs text-neutral-700 mt-0.5">
                Le enviamos un correo a {booking.studentName} avisándole que su cupo está asegurado.
              </p>
            </div>
          </div>
        )}

        {outcome === 'released' && (
          <div className="rounded-xl bg-neutral-100 border border-neutral-200 p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-neutral-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-bold text-neutral-900 text-sm">Cupo liberado</p>
              <p className="text-xs text-neutral-600 mt-0.5">
                La solicitud fue cancelada y el cupo volvió a quedar disponible para otros alumnos.
              </p>
            </div>
          </div>
        )}

        {outcome === 'already_resolved' && (
          <div className="rounded-xl bg-primary-bg/60 border border-primary/20 p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-bold text-neutral-900 text-sm">
                Esta reserva ya fue gestionada ({bookingStatusLabel(status)})
              </p>
              <p className="text-xs text-neutral-600 mt-0.5">
                No necesitas hacer nada más aquí. Puedes revisar el detalle completo desde tu panel.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-100 text-sm">
          <div className="p-3.5 flex items-center justify-between gap-3">
            <span className="text-neutral-500">Alumno</span>
            <span className="font-bold text-neutral-900 text-right">{booking.studentName}</span>
          </div>
          {booking.date && (
            <div className="p-3.5 flex items-center justify-between gap-3">
              <span className="text-neutral-500 flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4 text-primary" aria-hidden="true" /> Fecha
              </span>
              <span className="font-semibold text-neutral-900 text-right first-letter:uppercase">
                {formatLongDate(booking.date)}
                {booking.startTime ? ` · ${booking.startTime}${booking.endTime ? ` – ${booking.endTime}` : ''}` : ''}
              </span>
            </div>
          )}
          <div className="p-3.5 flex items-center justify-between gap-3">
            <span className="text-neutral-500">Cupos y monto</span>
            <span className="font-bold text-neutral-900 text-right">
              {booking.seats} cupo{booking.seats !== 1 ? 's' : ''} · {priceLabel}
            </span>
          </div>
          <div className="p-3.5 flex items-center justify-between gap-3">
            <span className="text-neutral-500">Estado actual</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-800">
              {bookingStatusLabel(status)}
            </span>
          </div>
        </div>

        {booking.studentNote && (
          <div className="rounded-xl bg-primary-bg/50 border border-primary/15 p-3.5">
            <p className="text-xs font-bold text-primary flex items-center gap-1.5 mb-1">
              <MessageSquareText className="w-3.5 h-3.5" aria-hidden="true" /> Mensaje del alumno
            </p>
            <p className="text-sm text-neutral-800 whitespace-pre-line">{booking.studentNote}</p>
          </div>
        )}

        {(studentChannels.whatsappUrl || studentChannels.instagramUrl) && (
          <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 space-y-2.5">
            <p className="text-xs font-bold text-neutral-700">
              Contactar a {booking.studentName.split(' ')[0]} en 1 clic
            </p>
            <div className="flex flex-wrap gap-2">
              {studentChannels.whatsappUrl && (
                <a
                  href={studentChannels.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#16a34a] text-white hover:opacity-90 transition-opacity"
                >
                  <WhatsAppIcon className="w-4 h-4" aria-hidden="true" />
                  WhatsApp{studentChannels.whatsappDisplay ? ` (${studentChannels.whatsappDisplay})` : ''}
                </a>
              )}
              {studentChannels.instagramUrl && (
                <a
                  href={studentChannels.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
                >
                  <InstagramIcon className="w-4 h-4" aria-hidden="true" />
                  {studentChannels.instagramHandle ?? 'Instagram'}
                </a>
              )}
            </div>
          </div>
        )}

        {error && <p role="alert" className="text-sm text-red font-medium">{error}</p>}

        {canAct && (
          <div className="space-y-3 pt-1">
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleDecision('confirm')}
              className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" aria-hidden="true" />}
              Confirmar reserva
            </button>

            {!confirmingRelease ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => setConfirmingRelease(true)}
                className="btn-outline w-full py-3 flex items-center justify-center gap-2 text-red border-red/30 hover:bg-red/5 disabled:opacity-50"
              >
                <X className="w-4 h-4" aria-hidden="true" />
                Liberar cupo
              </button>
            ) : (
              <div className="rounded-xl border border-red/30 bg-red/5 p-3.5 space-y-2.5">
                <p className="text-xs font-semibold text-neutral-800">
                  ¿Seguro que quieres liberar este cupo? Se cancelará la solicitud de {booking.studentName} y recibirá un correo de aviso.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDecision('release')}
                    className="flex-1 py-2 px-3 rounded-lg bg-red text-white text-xs font-bold hover:opacity-90 disabled:opacity-50"
                  >
                    Sí, liberar cupo
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setConfirmingRelease(false)}
                    className="py-2 px-3 rounded-lg border border-neutral-300 bg-white text-xs font-bold text-neutral-700"
                  >
                    Volver
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-neutral-100 text-center">
          <Link href="/dashboard/reservas" className="text-sm font-bold text-primary hover:underline">
            Ir a Reservas recibidas →
          </Link>
        </div>
      </div>
    </div>
  );
}
