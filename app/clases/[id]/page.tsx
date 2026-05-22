'use client';
import { notFound } from 'next/navigation';
import { use } from 'react';
import Link from 'next/link';
import { useState } from 'react';
import { MapPin, Clock, Users, Calendar, MessageCircle, Bookmark, ChevronLeft, Star, Globe, Camera, Video } from 'lucide-react';
import Header from '@/components/Header';
import ContactModal from '@/components/ContactModal';
import { mockClasses, getTypeLabel, formatPrice, formatTimeSlots } from '@/lib/mockData';

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

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <Link href="/clases" className="inline-flex items-center gap-1.5 text-[13px] text-neutral-500 hover:text-neutral-900 mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Volver a clases
        </Link>

        <div className="grid lg:grid-cols-[1fr_360px] gap-10">
          {/* LEFT COLUMN */}
          <div>
            {/* Image gallery */}
            <div className="relative rounded-xl overflow-hidden mb-6">
              <img
                src={images[activeImg]}
                alt={cls.title}
                className="w-full h-80 lg:h-[420px] object-cover"
              />
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="badge-black text-[11px]">{getTypeLabel(cls.type)}</span>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-pink-400 text-white whitespace-nowrap">
                  {cls.style}
                </span>
              </div>
              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`h-2 rounded-full transition-all ${i === activeImg ? 'bg-white w-5' : 'bg-white/60 w-2'}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Title */}
            <div className="mb-6">
              <h1 className="text-[30px] font-black text-neutral-900 tracking-snug leading-tight mb-2">{cls.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-[15px] text-neutral-500">
                <span className="font-semibold text-pink-600 bg-pink-50 border border-pink-100 px-2.5 py-0.5 rounded-full text-[13px]">
                  {cls.level}
                </span>
                <span>·</span>
                <Link href={`/profesores/${cls.teacher.id}`} className="hover:text-neutral-900 font-medium transition-colors hover:underline">
                  {cls.teacher.name}
                </Link>
                {cls.teacher.rating && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="font-semibold text-neutral-900">{cls.teacher.rating}</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <p className="text-[15px] text-neutral-600 leading-relaxed">{cls.fullDescription}</p>
            </div>

            {/* What you'll learn */}
            {cls.whatYouLearn && cls.whatYouLearn.length > 0 && (
              <div className="mb-8">
                <h2 className="font-bold text-neutral-900 text-[17px] mb-4">¿Qué aprenderás?</h2>
                <div className="grid sm:grid-cols-2 gap-2">
                  {cls.whatYouLearn.map(item => (
                    <div key={item} className="flex items-start gap-2.5 bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3">
                      <span className="text-pink-500 font-bold text-[15px] mt-0.5 shrink-0">✓</span>
                      <span className="text-[13px] text-neutral-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* For whom */}
            {cls.forWhom && (
              <div className="mb-8">
                <h2 className="font-bold text-neutral-900 text-[17px] mb-3">¿Para quién es?</h2>
                <p className="text-[15px] text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg p-4 leading-relaxed">{cls.forWhom}</p>
              </div>
            )}

            {/* Requirements */}
            {cls.requirements && (
              <div className="mb-8">
                <h2 className="font-bold text-neutral-900 text-[17px] mb-3">Requisitos</h2>
                <p className="text-[15px] text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg p-4">{cls.requirements}</p>
              </div>
            )}

            {/* What to bring */}
            {(cls.footwear || cls.clothing || (cls.toBring && cls.toBring.length > 0)) && (
              <div className="mb-8">
                <h2 className="font-bold text-neutral-900 text-[17px] mb-4">¿Qué traer?</h2>
                <div className="flex flex-col gap-2">
                  {cls.footwear && (
                    <div className="flex items-center gap-3 text-[15px] text-neutral-600">
                      <span className="text-lg">👟</span>
                      <span><strong className="text-neutral-900">Calzado:</strong> {cls.footwear}</span>
                    </div>
                  )}
                  {cls.clothing && (
                    <div className="flex items-center gap-3 text-[15px] text-neutral-600">
                      <span className="text-lg">👕</span>
                      <span><strong className="text-neutral-900">Ropa:</strong> {cls.clothing}</span>
                    </div>
                  )}
                  {cls.toBring?.map(item => (
                    <div key={item} className="flex items-center gap-3 text-[15px] text-neutral-600">
                      <span className="text-neutral-300">—</span> {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teacher card */}
            <div className="border border-neutral-200 rounded-xl p-6">
              <h2 className="font-bold text-neutral-900 text-[17px] mb-4">Sobre el profesor</h2>
              <div className="flex items-start gap-4">
                <Link href={`/profesores/${cls.teacher.id}`} className="shrink-0">
                  <img
                    src={cls.teacher.photo}
                    alt={cls.teacher.name}
                    className="w-16 h-16 rounded-xl object-cover hover:opacity-90 transition-opacity"
                  />
                </Link>
                <div className="flex-1">
                  <Link href={`/profesores/${cls.teacher.id}`} className="font-bold text-neutral-900 hover:underline transition-colors text-[15px]">
                    {cls.teacher.name}
                  </Link>
                  <p className="text-[13px] text-neutral-500 mt-0.5 capitalize">{cls.teacher.type} · {cls.teacher.experience} años de experiencia</p>
                  {cls.teacher.rating && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-[13px] font-semibold text-neutral-900">{cls.teacher.rating}</span>
                      {cls.teacher.totalClasses && (
                        <span className="text-[13px] text-neutral-400">· {cls.teacher.totalClasses} clases</span>
                      )}
                    </div>
                  )}
                  <p className="text-[13px] text-neutral-600 mt-2 leading-relaxed">{cls.teacher.bio}</p>
                  <div className="flex flex-wrap gap-3 mt-3">
                    {cls.teacher.instagram && (
                      <span className="text-[13px] text-neutral-500 flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5" /> {cls.teacher.instagram}
                      </span>
                    )}
                    {cls.teacher.tiktok && (
                      <span className="text-[13px] text-neutral-500 flex items-center gap-1">
                        <Video className="w-3.5 h-3.5" /> {cls.teacher.tiktok}
                      </span>
                    )}
                    {cls.teacher.website && (
                      <a href={cls.teacher.website} target="_blank" rel="noopener noreferrer" className="text-[13px] text-neutral-900 flex items-center gap-1 hover:underline font-medium">
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
              <div className="border-2 border-neutral-200 rounded-xl p-6 shadow-sm">
                {/* Price */}
                <div className="flex items-baseline justify-between mb-5">
                  <span className="text-[30px] font-black text-neutral-900 tracking-snug">
                    {formatPrice(cls.priceType, cls.price, cls.currency)}
                  </span>
                  {cls.isTrialFree && (
                    <span className="badge-green text-[11px]">1ra clase gratis</span>
                  )}
                </div>

                {/* Info rows */}
                <div className="flex flex-col gap-3 mb-5 border-t border-neutral-100 pt-5">
                  <div className="flex items-start gap-2.5 text-[13px] text-neutral-600">
                    <Clock className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
                    <span>{formatTimeSlots(cls.timeSlots)}</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-[13px] text-neutral-600">
                    <MapPin className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
                    <div>
                      {cls.venueName && <p className="font-semibold text-neutral-900">{cls.venueName}</p>}
                      <p>{cls.district}, {cls.city}</p>
                      {cls.address && <p className="text-neutral-400 mt-0.5">{cls.address}</p>}
                      {cls.reference && <p className="text-neutral-400">{cls.reference}</p>}
                    </div>
                  </div>
                  {cls.startDate && (
                    <div className="flex items-center gap-2.5 text-[13px] text-neutral-600">
                      <Calendar className="w-4 h-4 text-neutral-400 shrink-0" />
                      <span>Inicia {new Date(cls.startDate).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  )}
                  {spotsLeft !== undefined && spotsLeft > 0 && (
                    <div className="flex items-center gap-2.5 text-[13px] text-neutral-600">
                      <Users className="w-4 h-4 text-neutral-400 shrink-0" />
                      <span>
                        <strong className={spotsLeft <= 3 ? 'text-yellow-dark' : 'text-neutral-900'}>{spotsLeft}</strong> cupos disponibles
                        {cls.maxSpots && <span className="text-neutral-400"> de {cls.maxSpots}</span>}
                      </span>
                    </div>
                  )}
                </div>

                {/* Modality badge */}
                <div className="mb-5">
                  <span className="badge-gray capitalize">{cls.modality}</span>
                  {isFullyBooked && <span className="badge-gray ml-2">Sin cupos</span>}
                </div>

                {/* CTA buttons */}
                <button
                  onClick={() => setShowContact(true)}
                  disabled={isFullyBooked}
                  className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-btn transition-all text-[15px] mb-3 border-2 ${
                    isFullyBooked
                      ? 'bg-neutral-100 border-neutral-100 text-neutral-400 cursor-not-allowed'
                      : 'bg-[#25D366] border-[#25D366] hover:bg-[#20BC5A] hover:border-[#20BC5A] text-white'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  {isFullyBooked ? 'Sin cupos' : 'Contactar al profesor'}
                </button>

                <button
                  onClick={() => setSaved(!saved)}
                  className={`w-full flex items-center justify-center gap-2 text-[15px] font-semibold py-3 rounded-btn border-2 transition-all ${
                    saved
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'border-neutral-300 text-neutral-700 hover:border-neutral-900 hover:bg-neutral-50'
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
                    className="mt-3 w-full flex items-center justify-center gap-2 text-[13px] text-neutral-500 hover:text-neutral-900 transition-colors"
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
