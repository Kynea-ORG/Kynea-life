'use client';
import { use } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, Clock, Users, MessageCircle, Share2, Bookmark, ChevronLeft,
  Star, CheckCircle, AlertCircle, Video, Camera,
} from 'lucide-react';
import Header from '@/components/Header';
import ClassCard from '@/components/ClassCard';
import { mockClasses, getStatusLabel, getStatusColor, getTypeLabel, formatPrice, formatTimeSlots } from '@/lib/mockData';

export default function ClaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const cls = mockClasses.find(c => c.id === id);
  if (!cls) notFound();

  const otherClasses = mockClasses.filter(c => c.id !== cls.id && c.teacher.id === cls.teacher.id).slice(0, 3);
  const statusColor = getStatusColor(cls.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Back */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link href="/buscar" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Volver a resultados
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 md:pb-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="md:col-span-2 space-y-6">
            {/* Hero image */}
            <div className="relative rounded-2xl overflow-hidden">
              <img src={cls.coverImage} alt={cls.title} className="w-full h-72 md:h-96 object-cover" />
              <div className="absolute top-4 left-4 flex gap-2">
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusColor}`}>
                  {getStatusLabel(cls.status)}
                </span>
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-purple-100 text-purple-700">
                  {getTypeLabel(cls.type)}
                </span>
              </div>
            </div>

            {/* Title section */}
            <div>
              <p className="text-sm text-purple-600 font-semibold uppercase tracking-wide">{cls.style} · {cls.level}</p>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 mt-1">{cls.title}</h1>
              <p className="text-gray-500 mt-1">por <span className="text-gray-700 font-medium">{cls.teacher.name}</span></p>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-900 mb-3">Sobre esta clase</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{cls.fullDescription}</p>

              {cls.whatYouLearn && cls.whatYouLearn.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">¿Qué aprenderás?</h3>
                  <ul className="space-y-2">
                    {cls.whatYouLearn.map(item => (
                      <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {cls.forWhom && (
                <div className="mt-4 p-3 bg-purple-50 rounded-xl">
                  <p className="text-xs text-purple-700 font-semibold mb-1">¿Para quién es?</p>
                  <p className="text-sm text-gray-700">{cls.forWhom}</p>
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-900 mb-4">Horarios</h2>
              <div className="space-y-3">
                {cls.timeSlots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Clock className="w-4 h-4 text-purple-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{slot.days.join(', ')}</p>
                      <p className="text-xs text-gray-500">{slot.startTime} – {slot.endTime}</p>
                    </div>
                  </div>
                ))}
              </div>
              {cls.startDate && (
                <div className="mt-3 flex gap-4 text-sm text-gray-500">
                  <span>Inicio: <strong className="text-gray-700">{cls.startDate}</strong></span>
                  {cls.endDate && <span>Fin: <strong className="text-gray-700">{cls.endDate}</strong></span>}
                </div>
              )}
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">
                  {(cls.availableSpots ?? 0) > 0
                    ? <><strong className="text-gray-900">{cls.availableSpots}</strong> cupos disponibles de {cls.maxSpots}</>
                    : <span className="text-red-600 font-semibold">Sin cupos disponibles</span>
                  }
                </span>
              </div>
            </div>

            {/* Location */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-900 mb-4">Ubicación</h2>
              <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                <span className="font-semibold text-gray-800">{cls.modality}</span>
              </div>
              {cls.modality !== 'Online' && (
                <>
                  <p className="text-sm text-gray-700 mt-2">
                    {cls.address && <span>{cls.address}<br /></span>}
                    <span>{cls.district}, {cls.city}</span>
                  </p>
                  {cls.reference && (
                    <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      {cls.reference}
                    </p>
                  )}

                  {/* Simulated map */}
                  <div className="mt-4 rounded-xl overflow-hidden bg-slate-100 h-40 relative">
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #e8f4f8 0%, #d1e8f0 100%)' }}>
                      <svg className="w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
                        {Array.from({ length: 8 }, (_, i) => (
                          <line key={`h${i}`} x1="0" y1={`${i * 12.5}%`} x2="100%" y2={`${i * 12.5}%`} stroke="#64748b" strokeWidth="1" />
                        ))}
                        {Array.from({ length: 12 }, (_, i) => (
                          <line key={`v${i}`} x1={`${i * 8.33}%`} y1="0" x2={`${i * 8.33}%`} y2="100%" stroke="#64748b" strokeWidth="1" />
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
                          <MapPin className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {cls.mapsUrl && (
                    <a href={cls.mapsUrl} target="_blank" rel="noopener noreferrer"
                      className="mt-3 flex items-center gap-2 text-sm text-purple-600 font-medium hover:underline">
                      <MapPin className="w-4 h-4" /> Abrir en Google Maps
                    </a>
                  )}
                </>
              )}
            </div>

            {/* Requirements */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-900 mb-4">Recomendaciones</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {cls.footwear && (
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Calzado</p>
                    <p className="text-sm text-gray-700">👟 {cls.footwear}</p>
                  </div>
                )}
                {cls.clothing && (
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Ropa</p>
                    <p className="text-sm text-gray-700">👗 {cls.clothing}</p>
                  </div>
                )}
                {cls.prerequisites && (
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Requisitos previos</p>
                    <p className="text-sm text-gray-700">📋 {cls.prerequisites}</p>
                  </div>
                )}
                {cls.ageGroup && (
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Edad</p>
                    <p className="text-sm text-gray-700">🎂 {cls.ageGroup}</p>
                  </div>
                )}
                {cls.toBring && cls.toBring.length > 0 && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-500 font-semibold mb-2">Qué llevar</p>
                    <div className="flex flex-wrap gap-2">
                      {cls.toBring.map(item => (
                        <span key={item} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Teacher profile */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-900 mb-4">Profesor / Academia</h2>
              <div className="flex items-start gap-4">
                <img
                  src={cls.teacher.photo}
                  alt={cls.teacher.name}
                  className="w-16 h-16 rounded-2xl object-cover shrink-0"
                />
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{cls.teacher.name}</h3>
                  <p className="text-xs text-gray-500 capitalize mb-2">{cls.teacher.type} · {cls.teacher.experience} años de experiencia</p>
                  {cls.teacher.rating && (
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-semibold">{cls.teacher.rating}</span>
                    </div>
                  )}
                  <p className="text-sm text-gray-600">{cls.teacher.bio}</p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {cls.teacher.styles.map(s => (
                      <span key={s} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-3">
                    {cls.teacher.instagram && (
                      <a href="#" className="text-xs text-pink-600 flex items-center gap-1 hover:underline">
                        <Camera className="w-3.5 h-3.5" /> {cls.teacher.instagram}
                      </a>
                    )}
                    {cls.teacher.youtube && (
                      <a href="#" className="text-xs text-red-600 flex items-center gap-1 hover:underline">
                        <Video className="w-3.5 h-3.5" /> YouTube
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Other classes by same teacher */}
            {otherClasses.length > 0 && (
              <div>
                <h2 className="font-bold text-gray-900 mb-4">Más clases de {cls.teacher.name}</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {otherClasses.map(c => <ClassCard key={c.id} cls={c} compact />)}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-black text-gray-900">
                  {formatPrice(cls.priceType, cls.price, cls.currency)}
                </span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor}`}>
                  {getStatusLabel(cls.status)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                {cls.priceType === 'Mensual' ? 'por mes' : cls.priceType === 'Por clase' ? 'por clase' : ''}
              </p>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-purple-500" />
                  <span>{formatTimeSlots(cls.timeSlots).split(' | ')[0]}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-purple-500" />
                  <span>{cls.district}, {cls.city}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4 text-purple-500" />
                  <span>
                    {(cls.availableSpots ?? 0) > 0 ? `${cls.availableSpots} cupos disponibles` : 'Sin cupos'}
                  </span>
                </div>
              </div>

              <a
                href={`https://wa.me/${cls.teacher.whatsapp}?text=${encodeURIComponent(`Hola, me interesa la clase "${cls.title}". ¿Puedes darme más información?`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-xl transition-colors mb-3"
              >
                <MessageCircle className="w-5 h-5" />
                Contactar por WhatsApp
              </a>

              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600 text-sm font-medium py-2.5 rounded-xl transition-colors">
                  <Bookmark className="w-4 h-4" /> Guardar
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600 text-sm font-medium py-2.5 rounded-xl transition-colors">
                  <Share2 className="w-4 h-4" /> Compartir
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 z-50">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-lg font-black text-gray-900">{formatPrice(cls.priceType, cls.price, cls.currency)}</p>
            <p className="text-xs text-gray-500">{cls.availableSpots} cupos disponibles</p>
          </div>
          <a
            href={`https://wa.me/${cls.teacher.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            Contactar por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
