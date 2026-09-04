'use client';
import Link from 'next/link';
import SmartImage from '@/components/SmartImage';
import { Bookmark, BookOpen, MapPin, Clock, ArrowRight } from 'lucide-react';
import { formatPrice, formatTimeSlots } from '@/lib/utils';
import { classUrl } from '@/lib/classes/helpers';
import type { DanceClass } from '@/lib/types';
import ProfesorConversionCard from '../ProfesorConversionCard';

export default function AlumnoClient({
  savedClasses,
  userName,
}: {
  savedClasses: DanceClass[];
  userName: string;
}) {
  const firstName = userName.split(' ')[0] || 'bienvenido';

  return (
    <div className="p-6 lg:p-8 w-full">
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-black text-neutral-900 tracking-tight">
            Hola, {firstName} 👋
          </h1>
          <div className="flex flex-wrap items-center gap-2.5 mt-2">
            <p className="text-neutral-600 text-[15px]">Descubre y guarda tus clases favoritas</p>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-pastel-text bg-blue-pastel-bg px-2.5 py-1 rounded-full">
              <Bookmark className="w-3 h-3" /> {savedClasses.length} guardada{savedClasses.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <Link href="/clases" className="btn-outline btn-sm hidden sm:flex items-center gap-2">
          Explorar clases →
        </Link>
      </div>

      <ProfesorConversionCard />

      {/* Saved classes */}
      <section className="mb-8">
        <h2 className="text-[17px] font-bold text-neutral-900 mb-4">Clases guardadas</h2>

        {savedClasses.length === 0 ? (
          <div className="card-muted p-10 text-center animate-fade-in">
            <Bookmark className="w-10 h-10 text-neutral-300 mx-auto mb-3 animate-pop" />
            <p className="font-semibold text-neutral-700 mb-1">Sin clases guardadas aún</p>
            <p className="text-sm text-neutral-600 mb-5">
              Explora clases y presiona el botón &ldquo;Guardar clase&rdquo; para encontrarlas aquí.
            </p>
            <Link href="/clases" className="btn-outline btn-sm inline-flex items-center gap-2">
              Explorar clases <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {savedClasses.map(cls => (
              <Link
                key={cls.id}
                href={classUrl(cls)}
                className="bg-white card-dash p-4 flex items-start gap-4 hover:shadow-md transition-shadow block"
              >
                {cls.coverImage ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
                    <SmartImage src={cls.coverImage} alt={cls.title} fill sizes="80px" className="object-cover" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                    <BookOpen className="w-6 h-6 text-neutral-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-neutral-900 text-[15px] leading-snug">{cls.title}</p>
                  <p className="text-[13px] text-neutral-600 mt-0.5">{cls.teacher.name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="badge-pink text-[11px]">{cls.style}</span>
                    {cls.district && (
                      <span className="text-[12px] text-neutral-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {cls.district}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[13px] font-bold text-neutral-900">
                      {formatPrice(cls.priceType, cls.price, cls.currency)}
                    </span>
                    {cls.timeSlots.length > 0 && (
                      <span className="text-[12px] text-neutral-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeSlots(cls.timeSlots).split(' | ')[0]}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Explore CTA */}
      <div className="bg-primary card-dash p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-white font-bold text-[17px]">Descubre más clases</p>
          <p className="text-white/70 text-[14px] mt-0.5">Salsa, bachata, heels y más estilos cerca de ti</p>
        </div>
        <Link
          href="/clases"
          className="bg-white text-neutral-900 font-bold text-[14px] px-5 py-2.5 rounded-xl hover:bg-neutral-100 transition-colors shrink-0"
        >
          Explorar clases →
        </Link>
      </div>
    </div>
  );
}
