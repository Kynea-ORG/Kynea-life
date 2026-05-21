'use client';
import { notFound } from 'next/navigation';
import { use } from 'react';
import Link from 'next/link';
import { useState } from 'react';
import { MapPin, Clock, Users, Calendar, MessageCircle, Bookmark, ChevronLeft, Star, Globe, Camera, Video } from 'lucide-react';
import Header from '@/components/Header';
import ContactModal from '@/components/ContactModal';
import { mockClasses, getTypeLabel, formatPrice, formatTimeSlots, buildWhatsAppMessage } from '@/lib/mockData';

export default function ClaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const cls = mockClasses.find(c => c.id === id);
  if (!cls || cls.status !== 'published') notFound();

  return <ClaseDetail cls={cls} />;
}

function ClaseDetail({ cls }: { cls: ReturnType<typeof mockClasses.find> & {} }) {
  const [showContact, setShowContact] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  const images = [cls.coverImage, ...(cls.gallery || [])];
  const spotsLeft = cls.availableSpots;
  const isFullyBooked = spotsLeft === 0;

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-6xl mx-auto px-5 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Link href="/clases" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-700 mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Volver a clases
        </Link>

        <div className="grid lg:grid-cols-[1fr_380px] gap-10">
          {/* LEFT COLUMN */}
          <div>
            {/* Image gallery */}
            <div className="relative rounded-2xl overflow-hidden mb-6">
              <img
                src={images[activeImg]}
                alt={cls.title}
                className="w-full h-80 lg:h-[420px] object-cover"
              />
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/90 text-gray-700 backdrop-blur-sm">
                  {getTypeLabel(cls.type)}
                </span>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-purple-700 text-white">
                  {cls.style}
                </span>
              </div>
              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === activeImg ? 'bg-white w-5' : 'bg-white/60'}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Title section */}
            <div className="mb-6">
              <h1 className="text-2xl lg:text-3xl font-black text-gray-900 mb-2">{cls.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                <span className="font-semibold text-purple-700">{cls.level}</span>
                <span>·</span>
                <Link href={`/profesores/${cls.teacher.id}`} className="hover:text-purple-700 font-medium transition-colors">
                  {cls.teacher.name}
                </Link>
                {cls.teacher.rating && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      {cls.teacher.rating}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <p className="text-gray-600 leading-relaxed">{cls.fullDescription}</p>
            </div>

            {/* What you'll learn */}
            {cls.whatYouLearn && cls.whatYouLearn.length > 0 && (
              <div className="mb-8">
                <h2 className="font-bold text-gray-900 mb-4">¿Qué aprenderás?</h2>
                <div className="grid sm:grid-cols-2 gap-2">
                  {cls.whatYouLearn.map(item => (
                    <div key={item} className="flex items-start gap-2.5 bg-purple-50 rounded-xl px-4 py-3">
                      <span className="text-purple-600 font-bold text-sm mt-0.5">✓</span>
                      <span className="text-sm text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* For whom */}
            {cls.forWhom && (
              <div className="mb-8">
                <h2 className="font-bold text-gray-900 mb-3">¿Para quién es?</h2>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4 leading-relaxed">{cls.forWhom}</p>
              </div>
            )}

            {/* Requirements */}
            {cls.requirements && (
              <div className="mb-8">
                <h2 className="font-bold text-gray-900 mb-3">Requisitos</h2>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4">{cls.requirements}</p>
              </div>
            )}

            {/* What to bring */}
            {(cls.footwear || cls.clothing || (cls.toBring && cls.toBring.length > 0)) && (
              <div className="mb-8">
                <h2 className="font-bold text-gray-900 mb-4">¿Qué traer?</h2>
                <div className="flex flex-col gap-2">
                  {cls.footwear && (
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="text-lg">👟</span> <span><strong>Calzado:</strong> {cls.footwear}</span>
                    </div>
                  )}
                  {cls.clothing && (
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="text-lg">👕</span> <span><strong>Ropa:</strong> {cls.clothing}</span>
                    </div>
                  )}
                  {cls.toBring?.map(item => (
                    <div key={item} className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="text-lg">•</span> {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teacher card */}
            <div className="border border-gray-100 rounded-2xl p-6">
              <h2 className="font-bold text-gray-900 mb-4">Sobre el profesor</h2>
              <div className="flex items-start gap-4">
                <Link href={`/profesores/${cls.teacher.id}`}>
                  <img
                    src={cls.teacher.photo}
                    alt={cls.teacher.name}
                    className="w-16 h-16 rounded-full object-cover hover:opacity-90 transition-opacity"
                  />
                </Link>
                <div className="flex-1">
                  <Link href={`/profesores/${cls.teacher.id}`} className="font-bold text-gray-900 hover:text-purple-700 transition-colors">
                    {cls.teacher.name}
                  </Link>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">{cls.teacher.type} · {cls.teacher.experience} años de experiencia</p>
                  {cls.teacher.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-semibold text-gray-700">{cls.teacher.rating}</span>
                      {cls.teacher.totalClasses && (
                        <span className="text-xs text-gray-400">· {cls.teacher.totalClasses} clases publicadas</span>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">{cls.teacher.bio}</p>
                  <div className="flex gap-3 mt-3">
                    {cls.teacher.instagram && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5" /> {cls.teacher.instagram}
                      </span>
                    )}
                    {cls.teacher.tiktok && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Video className="w-3.5 h-3.5" /> {cls.teacher.tiktok}
                      </span>
                    )}
                    {cls.teacher.website && (
                      <a href={cls.teacher.website} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 flex items-center gap-1 hover:underline">
                        <Globe className="w-3.5 h-3.5" /> Sitio web
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN — Sticky booking card */}
          <div>
            <div className="sticky top-24">
              <div className="border border-gray-200 rounded-2xl p-6 shadow-sm">
                {/* Price */}
                <div className="flex items-baseline justify-between mb-4">
                  <span className="text-2xl font-black text-gray-900">
                    {formatPrice(cls.priceType, cls.price, cls.currency)}
                  </span>
                  {cls.isTrialFree && (
                    <span className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                      1ra clase gratis
                    </span>
                  )}
                </div>

                {/* Schedule */}
                <div className="flex flex-col gap-3 mb-5 text-sm text-gray-600">
                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <span>{formatTimeSlots(cls.timeSlots)}</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      {cls.venueName && <p className="font-medium text-gray-800">{cls.venueName}</p>}
                      <p>{cls.district}, {cls.city}</p>
                      {cls.address && <p className="text-xs text-gray-400 mt-0.5">{cls.address}</p>}
                      {cls.reference && <p className="text-xs text-gray-400">{cls.reference}</p>}
                    </div>
                  </div>
                  {cls.startDate && (
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>Inicia {new Date(cls.startDate).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  )}
                  {spotsLeft !== undefined && spotsLeft > 0 && (
                    <div className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>
                        <strong className={spotsLeft <= 3 ? 'text-orange-600' : 'text-gray-800'}>{spotsLeft}</strong> cupos disponibles
                        {cls.maxSpots && <span className="text-gray-400"> de {cls.maxSpots}</span>}
                      </span>
                    </div>
                  )}
                  {isFullyBooked && (
                    <div className="bg-red-50 text-red-600 text-xs font-semibold px-3 py-2 rounded-xl text-center">
                      Sin cupos disponibles
                    </div>
                  )}
                  <div className="text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-2 rounded-xl capitalize">
                    {cls.modality}
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={() => setShowContact(true)}
                  disabled={isFullyBooked}
                  className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-full transition-colors text-sm mb-3 ${
                    isFullyBooked
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-[#25D366] hover:bg-[#20BC5A] text-white shadow-sm'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  {isFullyBooked ? 'Sin cupos' : 'Contactar al profesor'}
                </button>

                <button
                  onClick={() => setSaved(!saved)}
                  className={`w-full flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-full border transition-colors ${
                    saved ? 'bg-purple-700 text-white border-purple-700' : 'border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-700'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${saved ? 'fill-white' : ''}`} />
                  {saved ? 'Guardado' : 'Guardar clase'}
                </button>

                {cls.mapsUrl && (
                  <a
                    href={cls.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 w-full flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-purple-700 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Ver en Google Maps
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showContact && (
        <ContactModal cls={cls} onClose={() => setShowContact(false)} isLoggedIn={false} />
      )}
    </div>
  );
}
