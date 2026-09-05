'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SmartImage from '@/components/SmartImage';
import { MapPin, Clock, Users, Calendar, MessageCircle, Bookmark, ChevronLeft, Star, Globe, Check, UserCheck, ClipboardCheck, Footprints, Shirt, Package, GraduationCap, Backpack } from 'lucide-react';
import { InstagramIcon, TikTokIcon } from '@/components/icons/SocialIcons';
import Header from '@/components/Header';
import ContactModal from '@/components/ContactModal';
import MapPreview from '@/components/MapPreview';
import { getTypeLabel, formatPrice, formatExperience, formatFriendlyDate, formatTimeSlots, buildWhatsAppMessage, buildGoogleMapsUrl, buildInstagramUrl, buildTikTokUrl } from '@/lib/utils';
import type { DanceClass } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { trackGenerateLead, trackAuthCtaClick, trackViewItem, trackSaveClass, trackTeacherSocialClick, trackSelectProfile } from '@/lib/analytics';
import LinkifiedText from '@/components/LinkifiedText';

export default function ClaseDetailClient({ cls }: { cls: DanceClass }) {
  const router = useRouter();
  const [showContact, setShowContact] = useState(false);
  const [contactType, setContactType] = useState<'whatsapp' | 'instagram'>('whatsapp');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [justContacted, setJustContacted] = useState<'whatsapp' | 'instagram' | null>(null);

  const contactMode = cls.contactMode ?? 'whatsapp';
  const showWa = contactMode === 'whatsapp' || contactMode === 'both';
  const showIg = contactMode === 'instagram' || contactMode === 'both';

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

  useEffect(() => {
    trackViewItem({
      classId: cls.id, className: cls.title, classStyle: cls.style,
      classType: cls.type, teacherId: cls.teacher.id, price: cls.price,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cls.id]);

  const socialClick = (channel: 'instagram' | 'tiktok' | 'website') =>
    trackTeacherSocialClick({ channel, teacherId: cls.teacher.id, teacherName: cls.teacher.name, surface: 'clase_detail' });

  // Los 5 links al perfil del profesor de esta página (nombre en la cabecera,
  // avatar y nombre del bloque "profesor", en su versión desktop y mobile)
  // apuntan todos al mismo destino — un solo handler para no repetirlo.
  const selectTeacherProfile = () =>
    trackSelectProfile({
      role: cls.teacher.type === 'academia' ? 'academia' : 'profesor',
      profileId: cls.teacher.id, profileName: cls.teacher.name, listName: 'clase_detail',
    });

  const toggleSave = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      trackAuthCtaClick({ action: 'login', location: 'save_class_gate' });
      router.push('/login');
      return;
    }
    setSaving(true);
    if (saved) {
      const { error } = await supabase.from('saved_classes').delete()
        .eq('user_id', session.user.id).eq('class_id', cls.id);
      if (!error) setSaved(false);
    } else {
      const { error } = await supabase.from('saved_classes').insert({ user_id: session.user.id, class_id: cls.id });
      // 23505 = already saved (stale local state, e.g. another tab) — treat as success.
      if (!error || error.code === '23505') {
        setSaved(true);
        trackSaveClass({ classId: cls.id, className: cls.title, classStyle: cls.style, teacherId: cls.teacher.id });
      }
    }
    setSaving(false);
  };

  const handleWhatsAppClick = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const loggedIn = !!session?.user;
    setIsLoggedIn(loggedIn);
    if (loggedIn && cls.teacher.whatsapp) {
      supabase.rpc('increment_class_contacts', { target_class_id: cls.id });
      const url = buildWhatsAppMessage(cls.style, cls.startDate, cls.teacher.whatsapp);
      window.open(url, '_blank', 'noopener,noreferrer');
      trackGenerateLead({
        channel: 'whatsapp', classId: cls.id, className: cls.title, classStyle: cls.style,
        teacherId: cls.teacher.id, teacherName: cls.teacher.name,
      });
      setJustContacted('whatsapp');
      setTimeout(() => setJustContacted(null), 1200);
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
      supabase.rpc('increment_class_contacts', { target_class_id: cls.id });
      const handle = cls.teacher.instagram.startsWith('@') ? cls.teacher.instagram.slice(1) : cls.teacher.instagram;
      window.open(`https://instagram.com/${handle}`, '_blank', 'noopener,noreferrer');
      trackGenerateLead({
        channel: 'instagram', classId: cls.id, className: cls.title, classStyle: cls.style,
        teacherId: cls.teacher.id, teacherName: cls.teacher.name,
      });
      setJustContacted('instagram');
      setTimeout(() => setJustContacted(null), 1200);
      return;
    }
    setContactType('instagram');
    setShowContact(true);
  };

  const images = [cls.coverImage, ...(cls.gallery || [])].filter(Boolean);
  const spotsLeft = cls.availableSpots;
  const isFullyBooked = spotsLeft === 0;
  const mapsHref = buildGoogleMapsUrl({ placeId: cls.placeId, lat: cls.lat, lng: cls.lng, address: cls.address });

  const priceDisplay = cls.priceType === 'Gratis' ? 'Gratis' : (
    cls.offerPrice ? (
      <span className="flex items-baseline gap-2">
        <span className="text-[30px] font-black text-primary">
          {formatPrice(cls.priceType, cls.offerPrice, cls.currency)}
        </span>
        <span className="text-[18px] text-neutral-400 line-through font-semibold">
          {formatPrice(cls.priceType, cls.price, cls.currency)}
        </span>
      </span>
    ) : formatPrice(cls.priceType, cls.price, cls.currency)
  );

  return (
    <div className="min-h-screen bg-white overflow-x-clip">
      <Header />

      <div className="max-w-[1200px] mx-auto px-6 py-8 w-full min-w-0">
        <Link href="/clases" className="inline-flex items-center gap-1.5 text-[13px] text-neutral-600 hover:text-neutral-900 mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Volver a clases
        </Link>

        <div className="grid lg:grid-cols-[1fr_360px] gap-10">
          {/* LEFT COLUMN */}
          <div className="min-w-0">
            <div className="relative rounded-xl overflow-hidden mb-6 h-80 lg:h-[420px] w-full max-w-full isolate">
              {images[activeImg] && (
                <SmartImage
                  src={images[activeImg]}
                  alt={cls.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 800px"
                  priority
                  className="object-cover"
                  style={activeImg === 0 ? { objectPosition: cls.coverImagePosition || '50% 50%', transform: `scale(${cls.coverImageZoom || 1})` } : undefined}
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
                      className="relative h-2 w-5 flex items-center"
                    >
                      <span
                        className={`block h-2 w-5 rounded-full origin-left transition-[transform,background-color] duration-200 ease-out ${
                          i === activeImg ? 'bg-white scale-x-100' : 'bg-white/60 scale-x-[0.4]'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-6 min-w-0">
              <h1 className="text-[30px] font-black text-neutral-900 tracking-snug leading-tight mb-2 break-words">{cls.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-[15px] text-neutral-600">
                <span className="font-semibold text-primary bg-primary-bg border border-primary-bg px-2.5 py-0.5 rounded-full text-[13px]">
                  Nivel {cls.level}
                </span>
                <span>·</span>
                <Link href={`/profesores/${cls.teacher.slug}`} onClick={selectTeacherProfile} className="hover:text-neutral-900 font-medium transition-colors hover:underline break-words">
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

            <div className="mb-8 min-w-0">
              <p className="text-[15px] text-neutral-600 leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere]"><LinkifiedText text={cls.fullDescription} /></p>
            </div>

            {cls.whatYouLearn && cls.whatYouLearn.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-full bg-primary-bg flex items-center justify-center shrink-0">
                    <GraduationCap className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <h2 className="font-bold text-neutral-900 text-[17px]">¿Qué aprenderás?</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {cls.whatYouLearn.map(item => (
                    <div key={item} className="flex items-start gap-2.5 bg-neutral-50 border border-neutral-200 rounded-md px-4 py-3 min-w-0">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-[13px] text-neutral-700 font-figtree break-words [overflow-wrap:anywhere]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(cls.forWhom || (cls.requirements && cls.requirements.length > 0)) && (
              <div className="mb-8 grid sm:grid-cols-2 gap-3">
                {cls.forWhom && (
                  <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-primary-bg flex items-center justify-center shrink-0">
                        <UserCheck className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <h2 className="font-bold text-neutral-900 text-[15px]">¿Para quién es?</h2>
                    </div>
                    <p className="text-[13px] text-neutral-600 leading-relaxed font-figtree break-words [overflow-wrap:anywhere]">{cls.forWhom}</p>
                  </div>
                )}

                {cls.requirements && cls.requirements.length > 0 && (
                  <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-primary-bg flex items-center justify-center shrink-0">
                        <ClipboardCheck className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <h2 className="font-bold text-neutral-900 text-[15px]">Requisitos</h2>
                    </div>
                    <p className="text-[13px] text-neutral-600 leading-relaxed font-figtree break-words [overflow-wrap:anywhere]">{cls.requirements.join(', ')}</p>
                  </div>
                )}
              </div>
            )}

            {((cls.footwear && cls.footwear.length > 0) || cls.clothing || (cls.toBring && cls.toBring.length > 0)) && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-full bg-primary-bg flex items-center justify-center shrink-0">
                    <Backpack className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <h2 className="font-bold text-neutral-900 text-[17px]">¿Qué traer?</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {cls.footwear && cls.footwear.length > 0 && (
                    <div className="flex items-start gap-2.5 bg-neutral-50 border border-neutral-200 rounded-md px-4 py-3 min-w-0">
                      <Footprints className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-[13px] text-neutral-700 font-figtree break-words [overflow-wrap:anywhere]"><strong className="font-sans text-neutral-900">Calzado:</strong> {cls.footwear.join(', ')}</span>
                    </div>
                  )}
                  {cls.clothing && (
                    <div className="flex items-start gap-2.5 bg-neutral-50 border border-neutral-200 rounded-md px-4 py-3 min-w-0">
                      <Shirt className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-[13px] text-neutral-700 font-figtree break-words [overflow-wrap:anywhere]"><strong className="font-sans text-neutral-900">Ropa:</strong> {cls.clothing}</span>
                    </div>
                  )}
                  {cls.toBring?.map(item => (
                    <div key={item} className="flex items-start gap-2.5 bg-neutral-50 border border-neutral-200 rounded-md px-4 py-3 min-w-0">
                      <Package className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-[13px] text-neutral-700 font-figtree break-words [overflow-wrap:anywhere]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cls.lat != null && cls.lng != null && (
              <div className="hidden lg:block mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-full bg-primary-bg flex items-center justify-center shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <h2 className="font-bold text-neutral-900 text-[17px]">Ubicación</h2>
                </div>
                <MapPreview lat={cls.lat} lng={cls.lng} label={`${cls.district}, ${cls.city}`} previewImageUrl={cls.mapImageUrl} className="h-64" />
              </div>
            )}

            <div className="hidden lg:block border border-neutral-200 rounded-xl p-6">
              <h2 className="font-bold text-neutral-900 text-[17px] mb-4">Sobre el profesor</h2>
              <div className="flex items-center gap-3.5 mb-4">
                <Link href={`/profesores/${cls.teacher.slug}`} onClick={selectTeacherProfile} className="shrink-0">
                  {cls.teacher.photo ? (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden hover:opacity-90 transition-opacity">
                      <SmartImage src={cls.teacher.photo} alt={cls.teacher.name} fill sizes="56px" className="object-cover" style={{ objectPosition: cls.teacher.photoPosition || '50% 50%', transform: `scale(${cls.teacher.photoZoom || 1})` }} />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-neutral-200 flex items-center justify-center text-xl font-bold text-neutral-600">
                      {cls.teacher.name.charAt(0)}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profesores/${cls.teacher.slug}`} onClick={selectTeacherProfile} className="font-bold text-neutral-900 hover:underline transition-colors text-[15px] break-words block leading-snug">
                    {cls.teacher.name}
                  </Link>
                  <p className="text-[13px] text-neutral-600 mt-0.5 capitalize">{cls.teacher.type} · {formatExperience(cls.teacher.experience)} de experiencia</p>
                  {cls.teacher.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-[13px] font-semibold text-neutral-900">{cls.teacher.rating}</span>
                      {cls.teacher.totalClasses && (
                        <span className="text-[13px] text-neutral-400">· {cls.teacher.totalClasses} clases</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {cls.teacher.bio && (
                <p className="text-[13px] text-neutral-600 leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere] mb-4">
                  <LinkifiedText text={cls.teacher.bio} />
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                {cls.teacher.instagram && (
                  <a
                    href={buildInstagramUrl(cls.teacher.instagram)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => socialClick('instagram')}
                    className="text-[13px] text-neutral-600 flex items-center gap-1 hover:text-neutral-900 transition-colors max-w-full"
                  >
                    <InstagramIcon className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{cls.teacher.instagram}</span>
                  </a>
                )}
                {cls.teacher.tiktok && (
                  <a
                    href={buildTikTokUrl(cls.teacher.tiktok)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => socialClick('tiktok')}
                    className="text-[13px] text-neutral-600 flex items-center gap-1 hover:text-neutral-900 transition-colors max-w-full"
                  >
                    <TikTokIcon className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{cls.teacher.tiktok}</span>
                  </a>
                )}
                {cls.teacher.website && (
                  <a href={cls.teacher.website} target="_blank" rel="noopener noreferrer" onClick={() => socialClick('website')} className="text-[13px] text-neutral-900 flex items-center gap-1 hover:underline font-medium max-w-full">
                    <Globe className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Sitio web</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="min-w-0">
            <div className="lg:sticky lg:top-24">
              <div className="border-2 border-neutral-200 rounded-lg p-6 shadow-sm">
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
                  <div className="flex items-start gap-2.5 text-[13px] text-neutral-600 min-w-0">
                    <MapPin className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      {cls.venueName && <p className="font-semibold text-neutral-900 break-words">{cls.venueName}</p>}
                      <p className="break-words">{cls.district}, {cls.city}</p>
                      {/* Older venues had their name defaulted to their own address
                          (no "nombre del local" field existed yet) — skip the address
                          line when it would just repeat the name above it. */}
                      {cls.address && cls.address !== cls.venueName && (
                        mapsHref ? (
                          <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="text-neutral-400 mt-0.5 hover:text-neutral-900 hover:underline block break-words [overflow-wrap:anywhere]">
                            {cls.address}
                          </a>
                        ) : (
                          <p className="text-neutral-400 mt-0.5 break-words [overflow-wrap:anywhere]">{cls.address}</p>
                        )
                      )}
                      {cls.reference && <p className="text-neutral-400 break-words [overflow-wrap:anywhere]">{cls.reference}</p>}
                    </div>
                  </div>
                  {cls.startDate && (
                    <div className="flex items-center gap-2.5 text-[13px] font-semibold text-neutral-900">
                      <Calendar className="w-4 h-4 text-primary shrink-0" />
                      <span>Inicia {formatFriendlyDate(cls.startDate)}</span>
                    </div>
                  )}
                  {cls.teacher.showSpots && spotsLeft !== undefined && spotsLeft > 0 && (
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
                      className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-btn transition-[background-color,border-color] active:scale-[0.97] text-[15px] border-2 ${
                        isFullyBooked
                          ? 'bg-neutral-100 border-neutral-100 text-neutral-400 cursor-not-allowed'
                          : 'bg-whatsapp border-whatsapp hover:bg-whatsapp-dark hover:border-whatsapp-dark text-white'
                      }`}
                    >
                      {justContacted === 'whatsapp' ? <Check className="w-4 h-4 animate-fade-in" /> : <MessageCircle className="w-4 h-4" />}
                      {isFullyBooked ? 'Sin cupos' : justContacted === 'whatsapp' ? 'Abriendo…' : 'WhatsApp'}
                    </button>
                  )}

                  {showIg && (
                    <button
                      onClick={handleInstagramClick}
                      disabled={isFullyBooked}
                      className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-btn transition-[background-color,border-color] active:scale-[0.97] text-[15px] border-2 ${
                        isFullyBooked
                          ? 'bg-neutral-100 border-neutral-100 text-neutral-400 cursor-not-allowed'
                          : 'bg-instagram border-instagram hover:bg-instagram-dark hover:border-instagram-dark text-white'
                      }`}
                    >
                      {justContacted === 'instagram' ? <Check className="w-4 h-4 animate-fade-in" /> : <InstagramIcon className="w-4 h-4" />}
                      {isFullyBooked ? 'Sin cupos' : justContacted === 'instagram' ? 'Abriendo…' : 'Instagram'}
                    </button>
                  )}

                  <button
                    onClick={toggleSave}
                    disabled={saving}
                    className={`w-full flex items-center justify-center gap-2 text-[15px] font-semibold py-3 rounded-btn border border-neutral-900 transition-[background-color,color] active:scale-[0.97] disabled:opacity-60 ${
                      saved
                        ? 'bg-neutral-900 text-white'
                        : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${saved ? 'fill-white animate-pop' : ''}`} />
                    {saved ? 'Guardado' : 'Guardar clase'}
                  </button>
                </div>

                {mapsHref && (
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 w-full flex items-center justify-center gap-2 text-[13px] text-neutral-600 hover:text-neutral-900 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Ver en Google Maps
                  </a>
                )}
              </div>
            </div>

            {cls.lat != null && cls.lng != null && (
              <div className="lg:hidden mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-full bg-primary-bg flex items-center justify-center shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <h2 className="font-bold text-neutral-900 text-[17px]">Ubicación</h2>
                </div>
                <MapPreview lat={cls.lat} lng={cls.lng} label={`${cls.district}, ${cls.city}`} previewImageUrl={cls.mapImageUrl} className="h-56" />
              </div>
            )}

            <div className="lg:hidden border border-neutral-200 rounded-xl p-6 mt-6 min-w-0">
              <h2 className="font-bold text-neutral-900 text-[17px] mb-4">Sobre el profesor</h2>
              <div className="flex items-center gap-3.5 mb-4">
                <Link href={`/profesores/${cls.teacher.slug}`} onClick={selectTeacherProfile} className="shrink-0">
                  {cls.teacher.photo ? (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden hover:opacity-90 transition-opacity">
                      <SmartImage src={cls.teacher.photo} alt={cls.teacher.name} fill sizes="56px" className="object-cover" style={{ objectPosition: cls.teacher.photoPosition || '50% 50%', transform: `scale(${cls.teacher.photoZoom || 1})` }} />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-neutral-200 flex items-center justify-center text-xl font-bold text-neutral-600">
                      {cls.teacher.name.charAt(0)}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profesores/${cls.teacher.slug}`} onClick={selectTeacherProfile} className="font-bold text-neutral-900 hover:underline transition-colors text-[15px] break-words block leading-snug">
                    {cls.teacher.name}
                  </Link>
                  <p className="text-[13px] text-neutral-600 mt-0.5 capitalize">{cls.teacher.type} · {formatExperience(cls.teacher.experience)} de experiencia</p>
                  {cls.teacher.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-[13px] font-semibold text-neutral-900">{cls.teacher.rating}</span>
                      {cls.teacher.totalClasses && (
                        <span className="text-[13px] text-neutral-400">· {cls.teacher.totalClasses} clases</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {cls.teacher.bio && (
                <p className="text-[13px] text-neutral-600 leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere] mb-4">
                  <LinkifiedText text={cls.teacher.bio} />
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                {cls.teacher.instagram && (
                  <a
                    href={buildInstagramUrl(cls.teacher.instagram)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => socialClick('instagram')}
                    className="text-[13px] text-neutral-600 flex items-center gap-1 hover:text-neutral-900 transition-colors max-w-full"
                  >
                    <InstagramIcon className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{cls.teacher.instagram}</span>
                  </a>
                )}
                {cls.teacher.tiktok && (
                  <a
                    href={buildTikTokUrl(cls.teacher.tiktok)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => socialClick('tiktok')}
                    className="text-[13px] text-neutral-600 flex items-center gap-1 hover:text-neutral-900 transition-colors max-w-full"
                  >
                    <TikTokIcon className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{cls.teacher.tiktok}</span>
                  </a>
                )}
                {cls.teacher.website && (
                  <a href={cls.teacher.website} target="_blank" rel="noopener noreferrer" onClick={() => socialClick('website')} className="text-[13px] text-neutral-900 flex items-center gap-1 hover:underline font-medium max-w-full">
                    <Globe className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Sitio web</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 px-4 py-3 z-40 flex items-center gap-3">
        <div className="shrink-0 max-w-[42%] min-w-0">
          <p className="text-[18px] font-black leading-none flex items-baseline gap-1.5 truncate">
            {cls.priceType === 'Gratis' ? (
              <span className="text-neutral-900">Gratis</span>
            ) : cls.offerPrice ? (
              <>
                <span className="text-primary">{formatPrice(cls.priceType, cls.offerPrice, cls.currency)}</span>
                <span className="text-[12px] text-neutral-400 line-through font-semibold">
                  {formatPrice(cls.priceType, cls.price, cls.currency)}
                </span>
              </>
            ) : (
              <span className="text-neutral-900">{formatPrice(cls.priceType, cls.price, cls.currency)}</span>
            )}
          </p>
          {cls.level && <p className="text-[12px] text-neutral-600 mt-0.5 truncate">Nivel {cls.level}</p>}
        </div>
        {/* Botones a flex-1: cuando hay dos canales activos, se reparten el
            ancho sobrante en vez de encogerse a solo ícono (ver el bloque de
            arriba, que ahora es shrink-0 con un tope de ancho). */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {showWa && (
            <button
              onClick={handleWhatsAppClick}
              disabled={isFullyBooked}
              className={`flex-1 flex items-center justify-center gap-2 font-bold py-3 px-3 rounded-btn text-[14px] transition-colors active:scale-[0.97] ${
                isFullyBooked ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-whatsapp hover:bg-whatsapp-dark text-white'
              }`}
            >
              {justContacted === 'whatsapp' ? <Check className="w-4 h-4 shrink-0 animate-fade-in" /> : <MessageCircle className="w-4 h-4 shrink-0" />}
              <span className="truncate">{isFullyBooked ? 'Sin cupos' : justContacted === 'whatsapp' ? 'Abriendo…' : 'WhatsApp'}</span>
            </button>
          )}
          {showIg && (
            <button
              onClick={handleInstagramClick}
              disabled={isFullyBooked}
              className={`flex-1 flex items-center justify-center gap-2 font-bold py-3 px-3 rounded-btn text-[14px] transition-colors active:scale-[0.97] ${
                isFullyBooked ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-instagram hover:bg-instagram-dark text-white'
              }`}
            >
              {justContacted === 'instagram' ? <Check className="w-4 h-4 shrink-0 animate-fade-in" /> : <InstagramIcon className="w-4 h-4 shrink-0" />}
              <span className="truncate">{isFullyBooked ? 'Sin cupos' : justContacted === 'instagram' ? 'Abriendo…' : 'Instagram'}</span>
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
