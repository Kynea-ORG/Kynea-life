import { Calendar, Clock, MapPin, MessageCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatFriendlyDate, formatTimeSlots } from '@/lib/utils';
import { contactNote, detailVenueTile, detailWhenTile, sessionDuration } from '@/lib/classes/detailInfo';
import type { DanceClass } from '@/lib/types';

interface Card { key: string; Icon: LucideIcon; title: string; sub?: string }

// "Lo esencial" (solo desktop): las cuatro cosas que decide una persona antes de contactar, en tarjetas
// con ícono. En mobile esto lo cubren los dos recuadros bajo la foto. Cada tarjeta se omite si no hay dato.
export default function ClassEssentials({ cls, isExpired }: { cls: DanceClass; isExpired: boolean }) {
  const cards: Card[] = [];

  const when = detailWhenTile(cls, isExpired);
  if (when?.date) {
    const title =
      when.date.label === 'FINALIZÓ' ? `Finalizó el ${when.date.big}`
      : when.date.label === 'INICIÓ' ? `Inició el ${when.date.big}`
      : when.date.label === 'ESTADO' ? 'Clase finalizada'
      : `Inicia ${when.date.big}`;
    cards.push({
      key: 'start', Icon: Calendar, title,
      sub: !isExpired && cls.endDate ? `Hasta ${formatFriendlyDate(cls.endDate)}` : undefined,
    });
  }

  const first = cls.timeSlots?.[0];
  if (first) {
    const more = cls.timeSlots.length - 1;
    cards.push({
      key: 'schedule', Icon: Clock,
      title: `${formatTimeSlots([first])}${more > 0 ? ` +${more} más` : ''}`,
      sub: sessionDuration(first) || undefined,
    });
  }

  if (cls.venueName || cls.district) {
    const venue = detailVenueTile(cls);
    cards.push({ key: 'where', Icon: MapPin, title: venue.title, sub: venue.sub || undefined });
  }

  cards.push({
    key: 'contact', Icon: MessageCircle,
    title: `Contacto directo con ${cls.teacher.type === 'academia' ? 'la academia' : 'el profesor'}`,
    sub: contactNote(cls.contactMode ?? 'whatsapp'),
  });

  return (
    <section data-testid="class-essentials" className="hidden lg:block mb-8 pt-8 border-t border-neutral-100">
      <h2 className="font-extrabold text-neutral-900 text-[20px] mb-4">Lo esencial</h2>
      <div className="grid grid-cols-2 gap-3">
        {cards.map(({ key, Icon, title, sub }) => (
          <div key={key} data-testid="essential-card" className="flex items-center gap-3.5 rounded-2xl border border-neutral-200 px-4 py-3.5 min-w-0">
            <span className="w-10 h-10 rounded-full bg-primary-bg text-primary-dark flex items-center justify-center shrink-0">
              <Icon className="w-[19px] h-[19px]" aria-hidden="true" />
            </span>
            <div className="min-w-0 leading-snug">
              <p className="font-bold text-neutral-900 text-[14.5px] break-words">{title}</p>
              {sub && <p className="text-[13px] text-neutral-500 break-words">{sub}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
