'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { List, MapPin, X, MessageCircle, Clock, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import { formatPrice, formatTimeSlots, getTypeLabel } from '@/lib/utils';
import type { DanceClass } from '@/lib/types';
import { useDelayedUnmount } from '@/lib/hooks/useDelayedUnmount';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function isClassToday(cls: DanceClass): boolean {
  const today = DAY_NAMES[new Date().getDay()];
  return cls.timeSlots.some(slot => slot.days.includes(today));
}

export default function MapaClient({ classes }: { classes: DanceClass[] }) {
  const [selectedClass, setSelectedClass] = useState<DanceClass | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const shouldRenderPopup = useDelayedUnmount(isOpen, 200);

  const openClass = (cls: DanceClass) => {
    setSelectedClass(cls);
    setIsOpen(true);
  };
  const toggleClass = (cls: DanceClass) => {
    if (isOpen && selectedClass?.id === cls.id) {
      setIsOpen(false);
    } else {
      openClass(cls);
    }
  };

  const mapBounds = {
    minLat: -12.20, maxLat: -12.05,
    minLng: -77.10, maxLng: -76.95,
  };

  const toPercent = (lat: number, lng: number) => ({
    top: ((mapBounds.maxLat - lat) / (mapBounds.maxLat - mapBounds.minLat)) * 100,
    left: ((lng - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng)) * 100,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Top bar */}
      <div className="bg-white border-b border-neutral-100 px-4 py-3 flex items-center gap-3 z-30">
        <div className="flex-1 text-sm text-neutral-600">
          <span className="font-bold text-neutral-900">{classes.length}</span> clases en Lima
        </div>
        <Link
          href="/clases"
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:border-neutral-900 transition-colors"
        >
          <List className="w-4 h-4" />
          Ver lista
        </Link>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="hidden md:flex flex-col w-96 shrink-0 bg-white border-r border-neutral-100 overflow-y-auto">
          <div className="p-4 border-b border-neutral-100">
            <h2 className="font-bold text-neutral-900">Clases disponibles</h2>
            <p className="text-xs text-neutral-500 mt-1">Haz clic en una clase o en un pin del mapa</p>
          </div>
          <div className="divide-y divide-neutral-50">
            {classes.map(cls => (
              <button
                key={cls.id}
                onClick={() => toggleClass(cls)}
                className={`w-full text-left p-4 hover:bg-neutral-50 transition-colors active:scale-[0.98] flex gap-3 ${
                  isOpen && selectedClass?.id === cls.id ? 'bg-neutral-100 border-l-2 border-neutral-900' : ''
                }`}
              >
                <div className="relative w-20 h-16 rounded-xl overflow-hidden shrink-0">
                  <Image src={cls.coverImage || '/logo.png'} alt={cls.title} fill sizes="80px" className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-neutral-900 font-semibold">{cls.style} · {getTypeLabel(cls.type)}</p>
                  <h3 className="font-bold text-neutral-900 text-sm leading-snug truncate">{cls.title}</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">{cls.teacher.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-neutral-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{cls.district}
                    </span>
                    <span className="text-xs font-bold text-neutral-900">{formatPrice(cls.priceType, cls.price, cls.currency)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Map area */}
        <div className="flex-1 relative bg-neutral-100 overflow-hidden">
          <div className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #e8f4f8 0%, #d1e8f0 30%, #c8e0ea 60%, #d4e8d4 100%)',
            }}
          >
            <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
              {Array.from({ length: 20 }, (_, i) => (
                <line key={`h${i}`} x1="0" y1={`${i * 5}%`} x2="100%" y2={`${i * 5}%`} stroke="#64748b" strokeWidth="1" />
              ))}
              {Array.from({ length: 30 }, (_, i) => (
                <line key={`v${i}`} x1={`${i * 3.33}%`} y1="0" x2={`${i * 3.33}%`} y2="100%" stroke="#64748b" strokeWidth="1" />
              ))}
              <line x1="0" y1="40%" x2="100%" y2="45%" stroke="#94a3b8" strokeWidth="3" />
              <line x1="30%" y1="0" x2="35%" y2="100%" stroke="#94a3b8" strokeWidth="3" />
              <line x1="0" y1="70%" x2="100%" y2="65%" stroke="#94a3b8" strokeWidth="2" />
            </svg>

            <div className="absolute top-[25%] left-[20%] text-xs font-semibold text-neutral-500 bg-white/60 px-2 py-1 rounded">Jesús María</div>
            <div className="absolute top-[40%] left-[35%] text-xs font-semibold text-neutral-500 bg-white/60 px-2 py-1 rounded">Miraflores</div>
            <div className="absolute top-[55%] left-[25%] text-xs font-semibold text-neutral-500 bg-white/60 px-2 py-1 rounded">Barranco</div>
            <div className="absolute top-[35%] left-[60%] text-xs font-semibold text-neutral-500 bg-white/60 px-2 py-1 rounded">Surco</div>
            <div className="absolute top-[25%] left-[50%] text-xs font-semibold text-neutral-500 bg-white/60 px-2 py-1 rounded">San Borja</div>

            {classes.map((cls, i) => {
              const pos = cls.lat != null && cls.lng != null ? toPercent(cls.lat, cls.lng) : null;
              if (!pos) return null;
              const isSelected = isOpen && selectedClass?.id === cls.id;
              const today = isClassToday(cls);
              return (
                <button
                  key={cls.id}
                  style={{ top: `${pos.top}%`, left: `${pos.left}%`, animationDelay: `${Math.min(i, 20) * 30}ms` }}
                  className="absolute transform -translate-x-1/2 -translate-y-full group z-20 animate-pin-in"
                  onClick={() => toggleClass(cls)}
                >
                  <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full shadow-lg text-xs font-bold whitespace-nowrap transition-[transform,background-color,color] ${
                    isSelected
                      ? 'bg-neutral-900 text-white scale-110'
                      : `bg-white text-neutral-900 hover:bg-neutral-900 hover:text-white hover:scale-105 ${today ? 'animate-pulse-soft' : ''}`
                  }`}>
                    {today && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                    <span>{formatPrice(cls.priceType, cls.price, cls.currency)}</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full mx-auto -mt-0.5 ${isSelected ? 'bg-neutral-900' : 'bg-white border-2 border-neutral-300'}`} />
                </button>
              );
            })}
          </div>

          {shouldRenderPopup && selectedClass && (
            <div
              className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-sm px-4 z-30 transition-[opacity,transform] duration-200 ease-out starting:opacity-0 starting:translate-y-4 ${
                isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                <div className="relative h-36">
                  <Image src={selectedClass.coverImage || '/logo.png'} alt={selectedClass.title} fill sizes="384px" className="object-cover" />
                  <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-3 right-3 w-7 h-7 bg-black/40 rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors active:scale-90"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="absolute top-3 left-3 text-xs font-semibold bg-white text-neutral-900 px-2.5 py-1 rounded-full">
                    {getTypeLabel(selectedClass.type)}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-xs text-neutral-900 font-semibold">{selectedClass.style}</p>
                  <h3 className="font-bold text-neutral-900 mt-0.5">{selectedClass.title}</h3>
                  <p className="text-xs text-neutral-500 mt-1">{selectedClass.teacher.name}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-neutral-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{selectedClass.district}
                    </span>
                    <span className="text-xs text-neutral-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{formatTimeSlots(selectedClass.timeSlots).split(' | ')[0]}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Link
                      href={`/clases/${selectedClass.id}`}
                      className="flex-1 text-center text-sm font-semibold py-2 rounded-xl border border-neutral-200 text-neutral-900 hover:bg-neutral-100 transition-colors flex items-center justify-center gap-1"
                    >
                      Ver clase <ChevronRight className="w-4 h-4" />
                    </Link>
                    {selectedClass.teacher.whatsapp && (
                      <a
                        href={`https://wa.me/${selectedClass.teacher.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center text-sm font-semibold py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white transition-colors flex items-center justify-center gap-1"
                      >
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mobile bottom sheet */}
          <div className="md:hidden absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-4 max-h-[40vh] overflow-y-auto z-20">
            <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mb-4" />
            <p className="text-sm font-bold text-neutral-900 mb-3">{classes.length} clases cerca</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {classes.map(cls => (
                <button
                  key={cls.id}
                  onClick={() => openClass(cls)}
                  className="shrink-0 w-48 text-left bg-neutral-50 rounded-xl overflow-hidden"
                >
                  <div className="relative w-full h-24">
                    <Image src={cls.coverImage || '/logo.png'} alt={cls.title} fill sizes="192px" className="object-cover" />
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-bold text-neutral-900 truncate">{cls.title}</p>
                    <p className="text-xs text-neutral-900 font-semibold">{formatPrice(cls.priceType, cls.price, cls.currency)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
