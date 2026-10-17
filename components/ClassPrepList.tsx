'use client';
import {
  GraduationCap,
  UserCheck,
  ClipboardCheck,
  Backpack,
  Check,
  Footprints,
  Shirt,
  Package,
} from 'lucide-react';
import type { DanceClass } from '@/lib/types';

type Props = Partial<
  Pick<DanceClass, 'whatYouLearn' | 'forWhom' | 'requirements' | 'footwear' | 'clothing' | 'toBring'>
>;

// Bloques de preparación de la clase (solo mobile): secciones independientes para
// ¿Qué aprenderás?, ¿Para quién es?, Requisitos y ¿Qué traer?, todas con la misma jerarquía visual.
export default function ClassPrepList({ cls }: { cls: Props }) {
  const hasLearn = Boolean(cls.whatYouLearn && cls.whatYouLearn.length > 0);
  const hasForWhom = Boolean(cls.forWhom);
  const hasRequirements = Boolean(cls.requirements && cls.requirements.length > 0);
  const hasBring = Boolean(
    (cls.footwear && cls.footwear.length > 0) ||
    cls.clothing ||
    (cls.toBring && cls.toBring.length > 0)
  );

  if (!hasLearn && !hasForWhom && !hasRequirements && !hasBring) {
    return null;
  }

  return (
    <div data-testid="class-prep-mobile" className="lg:hidden">
      {/* 1. ¿Qué aprenderás? */}
      {hasLearn && (
        <section className="mb-6 min-w-0">
          <div className="flex items-center gap-2 mb-3.5">
            <div className="w-7 h-7 rounded-full bg-primary-bg flex items-center justify-center shrink-0">
              <GraduationCap className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            </div>
            <h2 className="font-extrabold text-neutral-900 text-[18px]">¿Qué aprenderás?</h2>
          </div>
          <div className="grid gap-2">
            {cls.whatYouLearn!.map(item => (
              <div
                key={item}
                className="flex items-start gap-2.5 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 min-w-0"
              >
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                <span className="text-[13.5px] text-neutral-700 leading-snug break-words [overflow-wrap:anywhere]">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. ¿Para quién es? */}
      {hasForWhom && (
        <section className="mb-6 min-w-0">
          <div className="flex items-center gap-2 mb-3.5">
            <div className="w-7 h-7 rounded-full bg-primary-bg flex items-center justify-center shrink-0">
              <UserCheck className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            </div>
            <h2 className="font-extrabold text-neutral-900 text-[18px]">¿Para quién es?</h2>
          </div>
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 min-w-0">
            <p className="text-[13.5px] text-neutral-600 leading-relaxed break-words [overflow-wrap:anywhere]">
              {cls.forWhom}
            </p>
          </div>
        </section>
      )}

      {/* 3. Requisitos (misma estructura jerárquica que ¿Qué traer?) */}
      {hasRequirements && (
        <section className="mb-6 min-w-0">
          <div className="flex items-center gap-2 mb-3.5">
            <div className="w-7 h-7 rounded-full bg-primary-bg flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            </div>
            <h2 className="font-extrabold text-neutral-900 text-[18px]">Requisitos</h2>
          </div>
          <div className="grid gap-2">
            {cls.requirements!.map(req => (
              <div
                key={req}
                className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 min-w-0"
              >
                <span className="text-[13.5px] text-neutral-700 leading-snug break-words [overflow-wrap:anywhere]">
                  {req}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. ¿Qué traer? */}
      {hasBring && (
        <section className="mb-6 min-w-0">
          <div className="flex items-center gap-2 mb-3.5">
            <div className="w-7 h-7 rounded-full bg-primary-bg flex items-center justify-center shrink-0">
              <Backpack className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            </div>
            <h2 className="font-extrabold text-neutral-900 text-[18px]">¿Qué traer?</h2>
          </div>
          <div className="grid gap-2">
            {cls.footwear && cls.footwear.length > 0 && (
              <div className="flex items-start gap-2.5 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 min-w-0">
                <Footprints className="w-4 h-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                <span className="text-[13.5px] text-neutral-700 leading-snug break-words [overflow-wrap:anywhere]">
                  <strong className="font-bold text-neutral-900">Calzado:</strong> {cls.footwear.join(', ')}
                </span>
              </div>
            )}
            {cls.clothing && (
              <div className="flex items-start gap-2.5 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 min-w-0">
                <Shirt className="w-4 h-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                <span className="text-[13.5px] text-neutral-700 leading-snug break-words [overflow-wrap:anywhere]">
                  <strong className="font-bold text-neutral-900">Ropa:</strong> {cls.clothing}
                </span>
              </div>
            )}
            {cls.toBring?.map(item => (
              <div
                key={item}
                className="flex items-start gap-2.5 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 min-w-0"
              >
                <Package className="w-4 h-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                <span className="text-[13.5px] text-neutral-700 leading-snug break-words [overflow-wrap:anywhere]">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
