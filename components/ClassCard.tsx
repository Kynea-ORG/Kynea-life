'use client';
import Link from 'next/link';
import { MapPin, Clock, MessageCircle, ArrowRight, Users } from 'lucide-react';
import { DanceClass } from '@/lib/types';
import { getStatusLabel, getStatusColor, getTypeLabel, formatPrice, formatTimeSlots } from '@/lib/mockData';

interface ClassCardProps {
  cls: DanceClass;
  compact?: boolean;
}

export default function ClassCard({ cls, compact = false }: ClassCardProps) {
  const spotsLeft = cls.availableSpots;
  const statusLabel =
    spotsLeft === 0 && cls.status === 'active'
      ? 'Sin cupos'
      : spotsLeft <= 3 && spotsLeft > 0
      ? 'Últimos cupos'
      : getStatusLabel(cls.status);

  const statusColor =
    spotsLeft === 0 && cls.status === 'active'
      ? 'bg-red-50 text-red-600'
      : spotsLeft <= 3 && spotsLeft > 0
      ? 'bg-orange-50 text-orange-600'
      : cls.status === 'active'
      ? 'bg-emerald-50 text-emerald-700'
      : getStatusColor(cls.status);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md hover:border-purple-100 transition-all duration-200 flex flex-col">
      {/* Image */}
      <div className="relative overflow-hidden">
        <img
          src={cls.coverImage}
          alt={cls.title}
          className={`w-full object-cover ${compact ? 'h-36' : 'h-48'}`}
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 text-gray-700 backdrop-blur-sm">
            {getTypeLabel(cls.type)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1 gap-3">
        {/* Style tag + price */}
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
          <p className="text-sm text-gray-500 mt-0.5">{cls.teacher.name} · <span className="text-gray-400">{cls.level}</span></p>
        </div>

        {!compact && (
          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{cls.shortDescription}</p>
        )}

        {/* Meta */}
        <div className="flex flex-col gap-1.5 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            {cls.district}, {cls.city}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            {formatTimeSlots(cls.timeSlots).split(' | ')[0]}
          </span>
          {!compact && cls.availableSpots > 0 && (
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              {cls.availableSpots} cupos disponibles
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-1">
          <Link
            href={`/clase/${cls.id}`}
            className="flex-1 text-center text-sm font-semibold py-2.5 rounded-full border border-gray-200 text-gray-700 hover:border-purple-300 hover:text-purple-700 transition-colors flex items-center justify-center gap-1"
          >
            Ver clase
          </Link>
          <a
            href={`https://wa.me/${cls.teacher.whatsapp}?text=${encodeURIComponent(`Hola, me interesa la clase "${cls.title}"`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-sm font-semibold py-2.5 rounded-full bg-[#25D366] hover:bg-[#20BC5A] text-white transition-colors flex items-center justify-center gap-1.5"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
