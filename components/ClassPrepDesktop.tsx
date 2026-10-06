'use client';
import { useState } from 'react';
import { Check } from 'lucide-react';
import type { DanceClass } from '@/lib/types';

const VISIBLE_LEARN = 4;

type Props = Partial<Pick<DanceClass, 'whatYouLearn' | 'forWhom' | 'requirements' | 'footwear' | 'clothing' | 'toBring'>>;

const chipClass = 'inline-flex items-center rounded-full bg-neutral-100 px-3 py-1.5 text-[13px] font-semibold text-neutral-700';

// "¿Qué aprenderás?" y "Antes de ir" (solo desktop): lista con check y chips, en lugar de los bloques con
// cajas grises. En mobile se usa ClassPrepList. Cada parte aparece solo si el profesor llenó ese campo.
export default function ClassPrepDesktop({ cls }: { cls: Props }) {
  const [showAll, setShowAll] = useState(false);

  const learn = cls.whatYouLearn ?? [];
  const bring = [
    ...(cls.footwear?.length ? [`Calzado: ${cls.footwear.join(', ')}`] : []),
    ...(cls.clothing ? [`Ropa: ${cls.clothing}`] : []),
    ...(cls.toBring ?? []),
  ];
  const requirements = cls.requirements ?? [];
  const hasBefore = requirements.length > 0 || bring.length > 0 || !!cls.forWhom;
  if (learn.length === 0 && !hasBefore) return null;

  const visible = showAll ? learn : learn.slice(0, VISIBLE_LEARN);

  return (
    <div data-testid="class-prep-desktop" className="hidden lg:block">
      {learn.length > 0 && (
        <section className="mb-8 pt-8 border-t border-neutral-100">
          <h2 className="font-extrabold text-neutral-900 text-[20px] mb-4">¿Qué aprenderás?</h2>
          <ul className="grid grid-cols-2 gap-x-8 gap-y-3">
            {visible.map(item => (
              <li key={item} className="flex items-start gap-3 text-[14.5px] text-neutral-700 min-w-0">
                <span className="w-5 h-5 rounded-full bg-primary-bg text-primary flex items-center justify-center shrink-0 mt-px">
                  <Check className="w-3 h-3" aria-hidden="true" />
                </span>
                <span className="break-words [overflow-wrap:anywhere]">{item}</span>
              </li>
            ))}
          </ul>
          {learn.length > VISIBLE_LEARN && (
            <button
              type="button"
              onClick={() => setShowAll(s => !s)}
              aria-expanded={showAll}
              className="mt-4 h-10 px-4 rounded-btn border border-neutral-900 text-[14px] font-bold text-neutral-900 hover:bg-neutral-50 transition-colors"
            >
              {showAll ? 'Mostrar menos' : `Mostrar los ${learn.length} puntos`}
            </button>
          )}
        </section>
      )}

      {hasBefore && (
        <section className="mb-8 pt-8 border-t border-neutral-100">
          <h2 className="font-extrabold text-neutral-900 text-[20px] mb-4">Antes de ir</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            {requirements.length > 0 && (
              <div>
                <p className="text-[11px] font-extrabold tracking-[0.07em] text-neutral-500 mb-2">REQUISITOS</p>
                <div className="flex flex-wrap gap-2">{requirements.map(r => <span key={r} className={chipClass}>{r}</span>)}</div>
              </div>
            )}
            {bring.length > 0 && (
              <div>
                <p className="text-[11px] font-extrabold tracking-[0.07em] text-neutral-500 mb-2">QUÉ TRAER</p>
                <div className="flex flex-wrap gap-2">{bring.map(b => <span key={b} className={chipClass}>{b}</span>)}</div>
              </div>
            )}
            {cls.forWhom && (
              <div className="col-span-2">
                <p className="text-[11px] font-extrabold tracking-[0.07em] text-neutral-500 mb-2">PARA QUIÉN</p>
                <p className="text-[14.5px] leading-relaxed text-neutral-700 break-words [overflow-wrap:anywhere]">{cls.forWhom}</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
