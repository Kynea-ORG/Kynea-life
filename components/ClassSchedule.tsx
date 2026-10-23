import { formatTimeSlots } from '@/lib/utils';
import { scheduleRangeText, weekdayInitials } from '@/lib/classes/detailInfo';
import type { DanceClass } from '@/lib/types';

// "Horario" (solo desktop): cada turno en texto, el rango de fechas y los días de la semana con clase marcados.
export default function ClassSchedule({ cls }: { cls: DanceClass }) {
  const slots = cls.timeSlots ?? [];
  if (slots.length === 0) return null;
  const range = scheduleRangeText(cls);

  return (
    <section data-testid="class-schedule" className="hidden lg:block mb-8 pt-8 border-t border-neutral-100">
      <h2 className="font-extrabold text-neutral-900 text-[20px] mb-4">Horario</h2>
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0 leading-snug">
          {slots.map(s => {
            const line = formatTimeSlots([s]);
            return <p key={line} className="font-bold text-neutral-900 text-[15px]">{line}</p>;
          })}
          {range && <p className="text-[13px] text-neutral-500 mt-0.5">{range}</p>}
        </div>
        <ul aria-label="Días de clase" className="flex gap-2 shrink-0">
          {weekdayInitials(slots).map(d => (
            <li
              key={d.name}
              data-testid="weekday"
              data-active={d.active}
              aria-label={d.name}
              className={`w-9 h-9 rounded-full border flex items-center justify-center text-[13px] font-bold ${
                d.active ? 'bg-primary border-primary text-white' : 'border-neutral-200 text-neutral-500'
              }`}
            >
              {d.initial}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
