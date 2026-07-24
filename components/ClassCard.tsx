'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Clock, MessageCircle, Bookmark, Users, Check } from 'lucide-react';
import { DanceClass } from '@/lib/types';
import { getTypeLabel, formatPrice, formatTimeSlots, buildWhatsAppMessage } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import ContactModal from './ContactModal';

interface ClassCardProps {
  cls: DanceClass;
  compact?: boolean;
}

export default function ClassCard({ cls, compact = false }: ClassCardProps) {
  const [showContact, setShowContact] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [justContacted, setJustContacted] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user));
  }, []);

  const spotsLeft = cls.availableSpots;
  const isFullyBooked = spotsLeft === 0;
  const isAlmostFull = spotsLeft !== undefined && spotsLeft <= 3 && spotsLeft > 0;

  function handleContact() {
    if (isFullyBooked) return;
    if (!isLoggedIn) {
      setShowContact(true);
      return;
    }
    const mode = cls.contactMode ?? 'whatsapp';
    if ((mode === 'whatsapp' || mode === 'both') && cls.teacher.whatsapp) {
      window.open(buildWhatsAppMessage(cls.style, cls.startDate, cls.teacher.whatsapp), '_blank');
      setJustContacted(true);
      setTimeout(() => setJustContacted(false), 1200);
      return;
    }
    if ((mode === 'instagram' || mode === 'both') && cls.teacher.instagram) {
      const handle = cls.teacher.instagram.replace(/^@/, '');
      window.open(`https://instagram.com/${handle}`, '_blank');
      setJustContacted(true);
      setTimeout(() => setJustContacted(false), 1200);
      return;
    }
    // Logged in but teacher has no matching contact channel configured
    setShowContact(true);
  }

  return (
    <>
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden hover:shadow-lg hover:border-neutral-300 transition-[box-shadow,border-color,transform] duration-200 flex flex-col group hover:-translate-y-0.5">
        {/* Image */}
        {/* Hover zoom lives on this wrapper (not the <Image>) because the
            image already carries an inline transform for the saved crop
            zoom — an inline style would silently override any transform
            utility class placed on the same element. */}
        <div className={`relative overflow-hidden group-hover:scale-105 transition-transform duration-300 ${compact ? 'h-36' : 'h-48'}`}>
          <Image
            src={cls.coverImage || '/logo.png'}
            alt={cls.title}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
            style={{ objectPosition: cls.coverImagePosition || '50% 50%', transform: `scale(${cls.coverImageZoom || 1})` }}
          />
          <div className="absolute top-3 left-3 flex gap-2">
            {isFullyBooked && (
              <span className="badge-gray text-[11px]">Sin cupos</span>
            )}
            {isAlmostFull && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-yellow text-neutral-900 whitespace-nowrap">Últimos cupos</span>
            )}
          </div>
          <div className="absolute top-3 right-3">
            <span className="badge-black text-[11px]">{getTypeLabel(cls.type)}</span>
          </div>
          <button
            onClick={() => setSaved(!saved)}
            className={`absolute bottom-3 right-3 p-2 rounded-full shadow transition-[background-color,color] active:scale-90 ${
              saved ? 'bg-neutral-900 text-white' : 'bg-white/90 text-neutral-500 hover:text-neutral-900 backdrop-blur-sm'
            }`}
            title={saved ? 'Guardado' : 'Guardar clase'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-white animate-pop' : ''}`} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1 gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold bg-pink-50 text-pink-600 border border-pink-100 px-2.5 py-1 rounded-full">
              {cls.style}
            </span>
            <span className="text-[15px] font-bold text-neutral-900">
              {formatPrice(cls.priceType, cls.price, cls.currency)}
            </span>
          </div>

          <div>
            <h3 className="font-bold text-neutral-900 text-[15px] leading-snug">{cls.title}</h3>
            <p className="text-[13px] text-neutral-500 mt-0.5">
              {cls.teacher.name} · <span className="text-neutral-400">{cls.level}</span>
            </p>
          </div>

          {!compact && (
            <p className="text-[13px] text-neutral-500 line-clamp-2 leading-relaxed">{cls.shortDescription}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-[13px] text-neutral-500">
              <MapPin className="w-3.5 h-3.5 text-neutral-400" />
              {cls.venueName ? `${cls.venueName} · ` : ''}{cls.district}, {cls.city}
            </span>
            <span className="flex items-center gap-1.5 text-[13px] text-neutral-500">
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
              {formatTimeSlots(cls.timeSlots).split(' | ')[0]}
            </span>
            {!compact && spotsLeft !== undefined && spotsLeft > 0 && (
              <span className="flex items-center gap-1.5 text-[13px] text-neutral-500">
                <Users className="w-3.5 h-3.5 text-neutral-400" />
                {spotsLeft} cupos disponibles
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-auto pt-1">
            <Link
              href={`/clases/${cls.id}`}
              className="flex-1 text-center text-[13px] font-semibold py-2.5 rounded-btn border border-neutral-900 text-neutral-900 hover:bg-neutral-100 active:bg-neutral-200 transition-[background-color] active:scale-[0.97]"
            >
              Ver clase
            </Link>
            <button
              onClick={handleContact}
              disabled={isFullyBooked}
              className={`flex-1 text-[13px] font-semibold py-2.5 rounded-btn transition-[background-color,border-color] flex items-center justify-center gap-1.5 border ${
                isFullyBooked
                  ? 'bg-neutral-100 border-neutral-100 text-neutral-400 cursor-not-allowed'
                  : 'bg-primary border-neutral-900 hover:bg-primary-dark active:bg-neutral-900 text-white active:scale-[0.97]'
              }`}
            >
              {justContacted ? <Check className="w-3.5 h-3.5 animate-fade-in" /> : <MessageCircle className="w-3.5 h-3.5" />}
              {isFullyBooked ? 'Sin cupos' : justContacted ? 'Abriendo…' : 'Contactar'}
            </button>
          </div>
        </div>
      </div>

      {showContact && (
        <ContactModal
          cls={cls}
          onClose={() => setShowContact(false)}
          isLoggedIn={isLoggedIn}
          contactType={cls.contactMode === 'instagram' ? 'instagram' : 'whatsapp'}
        />
      )}
    </>
  );
}
