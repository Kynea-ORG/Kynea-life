'use client';
import { useState } from 'react';
import { GraduationCap, UserCheck, ClipboardCheck, Backpack } from 'lucide-react';
import { buildPrepLines, type PrepLine } from '@/lib/classes/detailInfo';
import type { DanceClass } from '@/lib/types';

const ICONS: Record<PrepLine['key'], typeof GraduationCap> = {
  learn: GraduationCap,
  forWhom: UserCheck,
  requirements: ClipboardCheck,
  bring: Backpack,
};

const COLLAPSED_LINES = 3;

// "Antes de ir" (solo mobile): reemplaza los bloques sueltos de qué aprenderás / para quién / requisitos /
// qué traer por una lista simple de ícono + texto. Muestra 3 líneas y "Ver todo (N)" despliega el resto.
export default function ClassPrepList({
  cls,
}: {
  cls: Partial<Pick<DanceClass, 'whatYouLearn' | 'forWhom' | 'requirements' | 'footwear' | 'clothing' | 'toBring'>>;
}) {
  const [expanded, setExpanded] = useState(false);
  const lines = buildPrepLines(cls);
  if (lines.length === 0) return null;

  const visible = expanded ? lines : lines.slice(0, COLLAPSED_LINES);
  const hasMore = lines.length > COLLAPSED_LINES;

  return (
    <section className="lg:hidden mt-6">
      <h2 className="font-extrabold text-neutral-900 text-[18px] mb-1">Antes de ir</h2>
      <ul>
        {visible.map(l => {
          const Icon = ICONS[l.key];
          return (
            <li key={l.key} className="flex items-start gap-3 py-2.5 border-b border-neutral-100 last:border-b-0">
              <Icon className="w-[19px] h-[19px] text-primary shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[14px] leading-snug text-neutral-600 min-w-0 break-words [overflow-wrap:anywhere]">
                <strong className="font-bold text-neutral-900">{l.label}:</strong> {l.text}
              </p>
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          aria-expanded={expanded}
          className="mt-1.5 text-[14px] font-extrabold text-neutral-900 underline underline-offset-[3px]"
        >
          {expanded ? 'Ver menos' : `Ver todo (${lines.length})`}
        </button>
      )}
    </section>
  );
}
