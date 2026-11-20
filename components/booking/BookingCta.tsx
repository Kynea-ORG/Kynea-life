'use client';
import { useState } from 'react';
import Link from 'next/link';
import { CalendarCheck } from 'lucide-react';
import { DanceClass } from '@/lib/types';
import { getBookability } from '@/lib/bookings/rules';
import BookingDialog from './BookingDialog';
import { classUrl } from '@/lib/classes/helpers';

interface Props {
  cls: DanceClass;
  isLoggedIn: boolean;
  /** 'sidebar' = botón grande de la tarjeta de acciones; 'bar' = barra fija inferior en móvil. */
  variant: 'sidebar' | 'bar';
}

/**
 * Botón "Reservar" de la ficha de clase y su ventana de reserva. Se muestra solo si la clase
 * acepta reservas (booking_mode ≠ none) y no es de un organizador externo. Los botones de
 * contacto por WhatsApp/Instagram se mantienen al lado.
 */
export default function BookingCta({ cls, isLoggedIn, variant }: Props) {
  const bookability = getBookability(cls);
  const [open, setOpen] = useState(false);

  const base = variant === 'sidebar'
    ? 'w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-btn transition-[background-color,border-color] active:scale-[0.97] text-[15px] border-2'
    : 'flex-[1.4] flex items-center justify-center gap-2 font-bold py-3 px-3 rounded-btn text-[14px] transition-colors active:scale-[0.97] border-2';

  if (!bookability.bookable) {
    if (bookability.reason !== 'sold_out') return null;
    return (
      <button type="button" disabled className={`${base} bg-neutral-100 border-neutral-100 text-neutral-400 cursor-not-allowed`}>
        <CalendarCheck className="w-4 h-4 shrink-0" />
        <span className="truncate">Sin cupos</span>
      </button>
    );
  }

  const buttonClass = `${base} bg-primary border-primary hover:bg-primary-dark hover:border-primary-dark text-white`;

  return (
    <>
      {isLoggedIn ? (
        <button type="button" onClick={() => setOpen(true)} className={buttonClass}>
          <CalendarCheck className="w-4 h-4 shrink-0" />
          <span className="truncate">Reservar</span>
        </button>
      ) : (
        <Link href={`/login?redirect=${classUrl(cls)}`} className={buttonClass}>
          <CalendarCheck className="w-4 h-4 shrink-0" />
          <span className="truncate">Reservar</span>
        </Link>
      )}
      {open && <BookingDialog cls={cls} onClose={() => setOpen(false)} />}
    </>
  );
}
