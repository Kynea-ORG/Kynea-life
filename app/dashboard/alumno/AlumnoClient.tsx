'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Bookmark, BookOpen, MapPin, Clock, ArrowRight } from 'lucide-react';
import { formatPrice, formatTimeSlots } from '@/lib/utils';
import type { DanceClass } from '@/lib/types';

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
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-black text-neutral-900 tracking-tight">
            Hola, {firstName} 👋
          </h1>
          <p className="text-neutral-500 text-[15px] mt-1">Descubre y guarda tus clases favoritas</p>
        </div>
        <Link href="/clases" className="btn-dark btn-sm hidden sm:flex items-center gap-2">
          Explorar clases →
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8 max-w-sm">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
            <Bookmark className="w-4 h-4 text-blue-700" />
          </div>
          <p className="text-[22px] font-black text-blue-700">{savedClasses.length}</p>
          <p className="text-[12px] font-medium text-neutral-500 mt-0.5">Clases guardadas</p>
        </div>
      </div>

      {/* Saved classes */}
      <section className="mb-8">
        <h2 className="text-[17px] font-bold text-neutral-900 mb-4">Clases guardadas</h2>

        {savedClasses.length === 0 ? (
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-10 text-center animate-fade-in">
            <Bookmark className="w-10 h-10 text-neutral-300 mx-auto mb-3 animate-pop" />
            <p className="font-semibold text-neutral-700 mb-1">Sin clases guardadas aún</p>
            <p className="text-sm text-neutral-500 mb-5">
              Explora clases y presiona el botón &ldquo;Guardar clase&rdquo; para encontrarlas aquí.
            </p>
            <Link href="/clases" className="btn-dark btn-sm inline-flex items-center gap-2">
              Explorar clases <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {savedClasses.map(cls => (
              <Link
                key={cls.id}
                href={`/clases/${cls.id}`}
                className="bg-white border border-neutral-200 rounded-xl p-4 flex items-start gap-4 hover:border-neutral-400 transition-colors block"
              >
                {cls.coverImage ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
                    <Image src={cls.coverImage} alt={cls.title} fill sizes="80px" className="object-cover" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                    <BookOpen className="w-6 h-6 text-neutral-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-neutral-900 text-[15px] leading-snug">{cls.title}</p>
                  <p className="text-[13px] text-neutral-500 mt-0.5">{cls.teacher.name}</p>
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
      <div className="bg-neutral-900 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-white font-bold text-[17px]">Descubre más clases</p>
          <p className="text-neutral-400 text-[14px] mt-0.5">Salsa, bachata, heels y más estilos cerca de ti</p>
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
