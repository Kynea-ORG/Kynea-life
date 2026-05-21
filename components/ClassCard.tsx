'use client';
import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Clock, MessageCircle, Bookmark, Users } from 'lucide-react';
import { DanceClass } from '@/lib/types';
import { getTypeLabel, formatPrice, formatTimeSlots } from '@/lib/mockData';
import ContactModal from './ContactModal';

interface ClassCardProps {
  cls: DanceClass;
  compact?: boolean;
}

export default function ClassCard({ cls, compact = false }: ClassCardProps) {
  const [showContact, setShowContact] = useState(false);
  const [saved, setSaved] = useState(false);

  const spotsLeft = cls.availableSpots;
  const isFullyBooked = spotsLeft === 0;
  const isAlmostFull = spotsLeft !== undefined && spotsLeft <= 3 && spotsLeft > 0;

  const badgeLabel = isFullyBooked ? 'Sin cupos' : isAlmostFull ? 'Últimos cupos' : null;
  const badgeColor = isFullyBooked
    ? 'bg-red-50 text-red-600'
    : 'bg-orange-50 text-orange-600';

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md hover:border-purple-100 transition-all duration-200 flex flex-col group">
        {/* Image */}
        <div className="relative overflow-hidden">
          <img
            src={cls.coverImage}
            alt={cls.title}
            className={`w-full object-cover group-hover:scale-105 transition-transform duration-300 ${compact ? 'h-36' : 'h-48'}`}
          />
          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {badgeLabel && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeColor}`}>
                {badgeLabel}
              </span>
            )}
          </div>
          <div className="absolute top-3 right-3 flex gap-1.5">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 text-gray-700 backdrop-blur-sm">
              {getTypeLabel(cls.type)}
            </span>
          </div>
          {/* Bookmark */}
          <button
            onClick={() => setSaved(!saved)}
            className={`absolute bottom-3 right-3 p-2 rounded-full shadow transition-all ${
              saved ? 'bg-purple-700 text-white' : 'bg-white/90 text-gray-500 hover:text-purple-700 backdrop-blur-sm'
            }`}
            title={saved ? 'Guardado' : 'Guardar clase'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-white' : ''}`} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1 gap-3">
          {/* Style + price */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full">
              {cls.style}
            </span>
            <span className="text-sm font-bold text-gray-900">
              {formatPrice(cls.priceType, cls.price, cls.currency)}
            </span>
          </div>

          {/* Title */}
          <div>
            <h3 className="font-bold text-gray-900 text-base leading-snug">{cls.title}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {cls.teacher.name} · <span className="text-gray-400">{cls.level}</span>
            </p>
          </div>

          {!compact && (
            <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{cls.shortDescription}</p>
          )}

          {/* Meta */}
          <div className="flex flex-col gap-1.5 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              {cls.venueName ? `${cls.venueName} · ` : ''}{cls.district}, {cls.city}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {formatTimeSlots(cls.timeSlots).split(' | ')[0]}
            </span>
            {!compact && spotsLeft !== undefined && spotsLeft > 0 && (
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                {spotsLeft} cupos disponibles
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-auto pt-1">
            <Link
              href={`/clases/${cls.id}`}
              className="flex-1 text-center text-sm font-semibold py-2.5 rounded-full border border-gray-200 text-gray-700 hover:border-purple-300 hover:text-purple-700 transition-colors"
            >
              Ver clase
            </Link>
            <button
              onClick={() => setShowContact(true)}
              disabled={isFullyBooked}
              className={`flex-1 text-sm font-semibold py-2.5 rounded-full transition-colors flex items-center justify-center gap-1.5 ${
                isFullyBooked
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-[#25D366] hover:bg-[#20BC5A] text-white'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              {isFullyBooked ? 'Sin cupos' : 'Contactar'}
            </button>
          </div>
        </div>
      </div>

      {showContact && (
        <ContactModal
          cls={cls}
          onClose={() => setShowContact(false)}
          isLoggedIn={false}
        />
      )}
    </>
  );
}
