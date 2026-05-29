'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Clock, Users, Calendar, MessageCircle, Bookmark, ChevronLeft, Star, Globe, Camera, Video } from 'lucide-react';

function IgIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
}
import Header from '@/components/Header';
import ContactModal from '@/components/ContactModal';
import { getTypeLabel, formatPrice, formatTimeSlots, buildWhatsAppMessage } from '@/lib/mockData';
import type { DanceClass } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

export default function ClaseDetailClient({ cls }: { cls: DanceClass }) {
  const [showContact, setShowContact] = useState(false);
  const [contactType, setContactType] = useState<'whatsapp' | 'instagram'>('whatsapp');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  const contactMode = cls.contactMode ?? 'whatsapp';
  const showWa = contactMode === 'whatsapp' || contactMode === 'ambos';
  const showIg = contactMode === 'instagram' || contactMode === 'ambos';

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      setIsLoggedIn(true);
      const { data } = await supabase
        .from('saved_classes')
        .select('class_id')
        .eq('user_id', session.user.id)
        .eq('class_id', cls.id)
        .maybeSingle();
      if (data) setSaved(true);
    });
  }, [cls.id]);

  const toggleSave = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = '/login'; return; }
    setSaving(true);
    if (saved) {
      await supabase.from('saved_classes').delete()
        .eq('user_id', session.user.id).eq('class_id', cls.id);
      setSaved(false);
    } else {
      await supabase.from('saved_classes').insert({ user_id: session.user.id, class_id: cls.id });
      setSaved(true);
    }
    setSaving(false);
  };

  const handleWhatsAppClick = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const loggedIn = !!session?.user;
    setIsLoggedIn(loggedIn);
    if (loggedIn && cls.teacher.whatsapp) {
      supabase.rpc('increment_class_contacts', { class_id: cls.id });
      const url = buildWhatsAppMessage(cls.style, cls.startDate, cls.teacher.whatsapp, cls.title);
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    setContactType('whatsapp');
    setShowContact(true);
  };

  const handleInstagramClick = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const loggedIn = !!session?.user;
    setIsLoggedIn(loggedIn);
    if (loggedIn && cls.teacher.instagram) {
      supabase.rpc('increment_class_contacts', { class_id: cls.id });
      const handle = cls.teacher.instagram.startsWith('@') ? cls.teacher.instagram.slice(1) : cls.teacher.instagram;
      window.open(`https://instagram.com/${handle}`, '_blank', 'noopener,noreferrer');
      return;
    }
    setContactType('instagram');
    setShowContact(true);
  };

  const images = [cls.coverImage, ...(cls.gallery || [])].filter(Boolean);
  const spotsLeft = cls.availableSpots;
  const isFullyBooked = spotsLeft === 0;

  const priceDisplay = cls.priceType === 'Gratis' ? 'Gratis' : (
    cls.offerPrice ? (
      <span className="flex items-baseline gap-2">
        <span className="text-[30px] font-black text-neutral-900">
          {cls.currency === 'PEN' ? 'S/' : '$'}{cls.offerPrice}
        </span>
        <span className="text-[18px] text-neutral-400 line-through font-semibold">
          {cls.currency === 'PEN' ? 'S/' : '$'}{cls.price}
        </span>
      </span>
    ) : formatPrice(cls.priceType, cls.price, cls.currency)
  );

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <Link href="/clases" className="inline-flex items-center gap-1.5 text-[13px] text-neutral-500 hover:text-neutral-900 mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Volver a clases
        </Link>

        <div className="grid lg:grid-cols-[1fr_360px] gap-10">
          {/* LEFT COLUMN */}
          <div>
            <div className="relative rounded-xl overflow-hidden mb-6">
              {images[activeImg] && (
                <img
                  src={images[activeImg]}
                  alt={cls.title}
                  className="w-full h-80 lg:h-[420px] object-cover"
                />
              )}
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="badge-black text-[11px]">{getTypeLabel(cls.type)}</span>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-primary text-white whitespace-nowrap">
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

            <div className="mb-6">
              <h1 className="text-[30px] font-black text-neutral-900 tracking-snug leading-tight mb-2">{cls.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-[15px] text-neutral-500">
                <span className="font-semibold text-primary bg-primary-bg border border-primary-bg px-2.5 py-0.5 rounded-full text-[13px]">
                  Nivel {cls.level}
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

            <div className="mb-8">
              <p className="text-[15px] text-neutral-600 leading-relaxed">{cls.fullDescription}</p>
            </div>

            {cls.whatYouLearn && cls.whatYouLearn.length > 0 && (
              <div className="mb-8">
                <h2 className="font-bold text-neutral-900 text-[17px] mb-4">¿Qué aprenderás?</h2>
                <div className="grid sm:grid-cols-2 gap-2">
                  {cls.whatYouLearn.map(item => (
                    <div key={item} className="flex items-start gap-2.5 bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3">
                      <span className="text-primary font-bold text-[15px] mt-0.5 shrink-0">✓</span>
                      <span className="text-[13px] text-neutral-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cls.forWhom && (
              <div className="mb-8">
                <h2 className="font-bold text-neutral-900 text-[17px] mb-3">¿Para quién es?</h2>
                <p className="text-[15px] text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg p-4 leading-relaxed">{cls.forWhom}</p>
              </div>
            )}

            {cls.requirements && (
              <div className="mb-8">
                <h2 className="font-bold text-neutral-900 text-[17px] mb-3">Requisitos</h2>
                <p className="text-[15px] text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg p-4">{cls.requirements}</p>
              </div>
            )}

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

            <div className="border border-neutral-200 rounded-xl p-6">
              <h2 className="font-bold text-neutral-900 text-[17px] mb-4">Sobre el profesor</h2>
              <div className="flex items-start gap-4">
                <Link href={`/profesores/${cls.teacher.id}`} className="shrink-0">
                  {cls.teacher.photo ? (
                    <img src={cls.teacher.photo} alt={cls.teacher.name} className="w-16 h-16 rounded-xl object-cover hover:opacity-90 transition-opacity" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-neutral-200 flex items-center justify-center text-xl font-bold text-neutral-500">
                      {cls.teacher.name.charAt(0)}
                    </div>
                  )}
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

          {/* RIGHT COLUMN */}
          <div>
            <div className="sticky top-24">
              <div className="border-2 border-neutral-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-baseline justify-between mb-5">
                  <div>
                    {typeof priceDisplay === 'string' ? (
                      <span className="text-[30px] font-black text-neutral-900 tracking-snug">{priceDisplay}</span>
                    ) : priceDisplay}
                  </div>
                  {cls.isTrialFree && (
                    <span className="badge-green text-[11px]">1ra clase gratis</span>
                  )}
                </div>

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

                <div className="mb-5">
                  <span className="badge-gray capitalize">{cls.modality}</span>
                  {isFullyBooked && <span className="badge-gray ml-2">Sin cupos</span>}
                  <span className="badge-gray ml-2 capitalize">Nivel {cls.level}</span>
                </div>

                <div className="flex flex-col gap-2">
                  {showWa && (
                    <button
                      onClick={handleWhatsAppClick}
                      disabled={isFullyBooked}
                      className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-btn transition-all text-[15px] border-2 ${
                        isFullyBooked
                          ? 'bg-neutral-100 border-neutral-100 text-neutral-400 cursor-not-allowed'
                          : 'bg-[#25D366] border-[#25D366] hover:bg-[#20BC5A] hover:border-[#20BC5A] text-white'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      {isFullyBooked ? 'Sin cupos' : 'WhatsApp'}
                    </button>
                  )}

                  {showIg && (
                    <button
                      onClick={handleInstagramClick}
                      disabled={isFullyBooked}
                      className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-btn transition-all text-[15px] border-2 ${
                        isFullyBooked
                          ? 'bg-neutral-100 border-neutral-100 text-neutral-400 cursor-not-allowed'
                          : 'bg-[#E1306C] border-[#E1306C] hover:bg-[#c9225a] hover:border-[#c9225a] text-white'
                      }`}
                    >
                      <IgIcon className="w-4 h-4" />
                      {isFullyBooked ? 'Sin cupos' : 'Instagram'}
                    </button>
                  )}

                  <button
                    onClick={toggleSave}
                    disabled={saving}
                    className={`w-full flex items-center justify-center gap-2 text-[15px] font-semibold py-3 rounded-btn border-2 transition-all disabled:opacity-60 ${
                      saved
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'border-neutral-300 text-neutral-700 hover:border-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${saved ? 'fill-white' : ''}`} />
                    {saved ? 'Guardado' : 'Guardar clase'}
                  </button>
                </div>

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

      {/* Mobile sticky bottom CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 px-4 py-3 z-40 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[18px] font-black text-neutral-900 leading-none">
            {cls.priceType === 'Gratis' ? 'Gratis' : (
              cls.offerPrice
                ? `${cls.currency === 'PEN' ? 'S/' : '$'}${cls.offerPrice}`
                : formatPrice(cls.priceType, cls.price, cls.currency)
            )}
          </p>
          {cls.level && <p className="text-[12px] text-neutral-500 mt-0.5">Nivel {cls.level}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          {showWa && (
            <button
              onClick={handleWhatsAppClick}
              disabled={isFullyBooked}
              className={`flex items-center gap-2 font-bold py-3 px-4 rounded-btn text-[14px] transition-all ${
                isFullyBooked ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-[#25D366] hover:bg-[#20BC5A] text-white'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              {!showIg && (isFullyBooked ? 'Sin cupos' : 'Contactar')}
            </button>
          )}
          {showIg && (
            <button
              onClick={handleInstagramClick}
              disabled={isFullyBooked}
              className={`flex items-center gap-2 font-bold py-3 px-4 rounded-btn text-[14px] transition-all ${
                isFullyBooked ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-[#E1306C] hover:bg-[#c9225a] text-white'
              }`}
            >
              <IgIcon className="w-4 h-4" />
              {!showWa && (isFullyBooked ? 'Sin cupos' : 'Contactar')}
            </button>
          )}
        </div>
      </div>

      {/* Extra padding so content isn't hidden behind mobile CTA */}
      <div className="lg:hidden h-20" />

      {showContact && (
        <ContactModal
          cls={cls}
          onClose={() => setShowContact(false)}
          isLoggedIn={isLoggedIn}
          contactType={contactType}
        />
      )}
    </div>
  );
}
