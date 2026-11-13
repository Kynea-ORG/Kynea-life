import { Footprints, Shirt, Backpack, ListChecks } from 'lucide-react';

interface Props {
  footwear?: string[];
  clothing?: string | null;
  toBring?: string[];
  requirements?: string[];
  /** Quién da las recomendaciones, para el título ("Carlos recomienda"). */
  teacherName?: string;
}

/** Recomendaciones del profesor para la clase. No dibuja nada si no dejó ninguna. */
export default function ClassTips({ footwear = [], clothing, toBring = [], requirements = [], teacherName }: Props) {
  const rows = [
    { icon: Footprints, label: 'Calzado', text: footwear.join(', ') },
    { icon: Shirt, label: 'Ropa', text: clothing ?? '' },
    { icon: Backpack, label: 'Lleva contigo', text: toBring.join(', ') },
    { icon: ListChecks, label: 'Conviene que sepas', text: requirements.join(', ') },
  ].filter(r => r.text.trim());
  if (rows.length === 0) return null;

  return (
    <section aria-label="Recomendaciones del profesor" className="rounded-xl bg-primary-bg/60 border border-primary/15 p-3.5">
      <p className="text-[13px] font-extrabold text-neutral-900 mb-2.5">
        {teacherName ? `${teacherName.split(' ')[0]} te recomienda` : 'Recomendaciones del profesor'}
      </p>
      <ul className="space-y-2">
        {rows.map(({ icon: Icon, label, text }) => (
          <li key={label} className="flex items-start gap-2.5">
            <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[13px] leading-snug text-neutral-700">
              <span className="font-bold text-neutral-900">{label}: </span>{text}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
