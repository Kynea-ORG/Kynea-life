'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SmartImage from '@/components/SmartImage';
import { MapPin, Clock, Users, Calendar, MessageCircle, Bookmark, ChevronLeft, ChevronRight, Share2, Navigation, Star, Globe, Check, UserCheck, ClipboardCheck, Footprints, Shirt, Package, GraduationCap, Backpack } from 'lucide-react';
import { InstagramIcon, TikTokIcon } from '@/components/icons/SocialIcons';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ContactModal from '@/components/ContactModal';
import MapPreview from '@/components/MapPreview';
import { getTypeLabel, formatPrice, formatExperience, formatFriendlyDate, formatTimeSlots, buildWhatsAppMessage, buildGoogleMapsUrl, buildInstagramUrl, buildTikTokUrl, formatSocialHandle, getProfileUrl } from '@/lib/utils';
import type { DanceClass } from '@/lib/types';
import { isClassExpired } from '@/lib/classes/helpers';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { trackGenerateLead, trackAuthCtaClick, trackViewItem, trackSaveClass, trackTeacherSocialClick, trackSelectProfile } from '@/lib/analytics';
import LinkifiedText from '@/components/LinkifiedText';
import ClampedText from '@/components/ClampedText';
import ClassQuickFacts from '@/components/ClassQuickFacts';
import ClassPrepList from '@/components/ClassPrepList';
import { detailChips } from '@/lib/classes/detailInfo';

export default function ClaseDetailClient({ cls }: { cls: DanceClass }) {
  const router = useRouter();
  const isExpired = isClassExpired(cls);
  const [showContact, setShowContact] = useState(false);
  const [contactType, setContactType] = useState<'whatsapp' | 'instagram'>('whatsapp');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user, isLoggedIn } = useAuth();
  const [activeImg, setActiveImg] = useState(0);
  const [justContacted, setJustContacted] = useState<'whatsapp' | 'instagram' | null>(null);
  const [copied, setCopied] = useState(false);

  const contactMode = cls.contactMode ?? 'whatsapp';
  const showWa = contactMode === 'whatsapp' || contactMode === 'both';
  const showIg = contactMode === 'instagram' || contactMode === 'both';

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from('saved_classes')
      .select('class_id')
      .eq('user_id', user.id)
      .eq('class_id', cls.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSaved(true);
      });
  }, [cls.id, user]);

  useEffect(() => {
    trackViewItem({
      classId: cls.id, className: cls.title, classStyle: cls.style,
      classType: cls.type, teacherId: cls.teacher.id, price: cls.price,
    });
    // Contador propio (dashboard), separado del evento GA4 de arriba — ver
    // increment_class_views (migración 46). .then() para forzar el fetch.
    // Deduplicación por sesión: evita incrementar vistas repetidamente en recargas (F5).
    const viewKey = `kynea_viewed_class_${cls.id}`;
    if (!sessionStorage.getItem(viewKey)) {
      sessionStorage.setItem(viewKey, '1');
      createClient().rpc('increment_class_views', { target_class_id: cls.id }).then(() => {}, () => {});
    }
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
    if (!user) {
      trackAuthCtaClick({ action: 'login', location: 'save_class_gate' });
      router.push('/login');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    if (saved) {
      const { error } = await supabase.from('saved_classes').delete()
        .eq('user_id', user.id).eq('class_id', cls.id);
      if (!error) setSaved(false);
    } else {
      const { error } = await supabase.from('saved_classes').insert({ user_id: user.id, class_id: cls.id });
      // 23505 = already saved (stale local state, e.g. another tab) — treat as success.
      if (!error || error.code === '23505') {
        setSaved(true);
        trackSaveClass({ classId: cls.id, className: cls.title, classStyle: cls.style, teacherId: cls.teacher.id });
      }
    }
    setSaving(false);
  };

  // Mobile: el botón "atrás" de la foto vuelve a donde estaba la persona (lista con sus filtros, Home…).
  // Si abrió la clase desde un enlace compartido y no hay historial, va a la lista.
  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/clases');
  };

  // Menú de compartir del celular; si el navegador no lo tiene, copia el enlace y avisa.
  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: cls.title, text: `${cls.title} en Kynea`, url });
      } catch {
        // La persona cerró el menú: no es un error.
      }
      return;
    }
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso para copiar: no hay nada más que hacer.
    }
  };

  const triggerContactIncrement = (classId: string) => {
    try {
      const contactKey = `kynea_contact_${classId}`;
      const lastContact = sessionStorage.getItem(contactKey);
      if (!lastContact || Date.now() - parseInt(lastContact, 10) > 30000) {
        sessionStorage.setItem(contactKey, String(Date.now()));
        createClient().rpc('increment_class_contacts', { target_class_id: classId }).then(() => {}, () => {});
      }
    } catch {
      createClient().rpc('increment_class_contacts', { target_class_id: classId }).then(() => {}, () => {});
    }
  };

  const handleWhatsAppClick = () => {
    if (isLoggedIn && cls.teacher.whatsapp) {
      triggerContactIncrement(cls.id);
      const url = isExpired
        ? `https://wa.me/${cls.teacher.whatsapp.replace(/\s+/g, '')}?text=${encodeURIComponent(`Hola ${cls.teacher.name}, vi tu clase de ${cls.style} en Kynea y quisiera consultar por próximas fechas o talleres.`)}`
        : buildWhatsAppMessage(cls.style, cls.startDate, cls.teacher.whatsapp);
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

  const handleInstagramClick = () => {
    if (isLoggedIn && cls.teacher.instagram) {
      triggerContactIncrement(cls.id);
      const url = buildInstagramUrl(cls.teacher.instagram);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
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
  const hasCoords = cls.lat != null && cls.lng != null;

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

  const expiredBanner = (
    <div className="mb-6 lg:mb-8 p-4 sm:p-5 rounded-2xl bg-neutral-100 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3.5">
        <div>
          <p className="text-[15px] font-bold text-neutral-900 leading-snug">
            Esta clase ya finalizó{cls.endDate ? ` el ${formatFriendlyDate(cls.endDate)}` : ''}
          </p>
          <p className="text-[13px] text-neutral-600 mt-0.5 leading-normal">
            Las fechas programadas para este taller o curso ya concluyeron. Puedes consultar directamente al profesor por próximas ediciones o explorar clases similares.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
        <Link
          href={getProfileUrl(cls.teacher)}
          onClick={selectTeacherProfile}
          className="px-4 py-2 text-[13px] font-bold rounded-btn bg-neutral-900 text-white hover:bg-neutral-800 transition-colors whitespace-nowrap"
        >
          Ver perfil del profesor
        </Link>
        <Link
          href={`/clases?estilo=${encodeURIComponent(cls.style)}`}
          className="px-4 py-2 text-[13px] font-bold rounded-btn border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors whitespace-nowrap"
        >
          Más de {cls.style}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white overflow-x-clip">
      {/* En mobile la foto va a sangre con sus propios botones (atrás, compartir, guardar): sin header. */}
      <Header className="max-lg:hidden" />

      <div className="max-w-[640px] lg:max-w-[1200px] mx-auto px-4 lg:px-6 pt-0 pb-8 lg:py-8 w-full min-w-0">
        <Link href="/clases" className="hidden lg:inline-flex items-center gap-1.5 text-[13px] text-neutral-600 hover:text-neutral-900 mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Volver a clases
        </Link>

        {isExpired && <div className="hidden lg:block">{expiredBanner}</div>}

        <div className="grid lg:grid-cols-[1fr_360px] gap-0 lg:gap-10">
          {/* LEFT COLUMN */}
          <div className="min-w-0">
            {/* Foto: una sola. En mobile va a sangre (280 px) con atrás / compartir / guardar encima;
                desde lg es la caja con esquinas de siempre. */}
            <div data-testid="detail-hero" className="relative overflow-hidden isolate -mx-4 lg:mx-0 lg:rounded-xl lg:mb-6 h-[280px] lg:h-[420px]">
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
              {isExpired && (
                <div className="absolute inset-0 bg-black/30 pointer-events-none" />
              )}
              <div className="hidden lg:flex absolute top-4 left-4 gap-2 flex-wrap">
                {isExpired && (
                  <span className="badge-gray text-[11px] shadow-xs">
                    Finalizada
                  </span>
                )}
                <span className="badge-black text-[11px]">{getTypeLabel(cls.type)}</span>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-primary text-white whitespace-nowrap">
                  {cls.style}
                </span>
              </div>
              {images.length > 1 && (
                <div data-testid="gallery-dots" className="hidden lg:flex absolute bottom-4 left-1/2 -translate-x-1/2 gap-1.5">
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

              {/* Solo mobile: botones flotantes sobre la foto */}
              <div className="lg:hidden">
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-black/0 pointer-events-none" />
                <button
                  type="button"
                  onClick={handleBack}
                  aria-label="Volver"
                  className="absolute left-3 top-3 w-9 h-9 rounded-full bg-white/95 text-neutral-900 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="absolute right-3 top-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleShare}
                    aria-label="Compartir clase"
                    className="w-9 h-9 rounded-full bg-white/95 text-neutral-900 flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <Share2 className="w-[17px] h-[17px]" />
                  </button>
                  {!isExpired && (
                    <button
                      type="button"
                      onClick={toggleSave}
                      disabled={saving}
                      aria-label={saved ? 'Guardado' : 'Guardar clase'}
                      className="w-9 h-9 rounded-full bg-white/95 text-neutral-900 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-60"
                    >
                      <Bookmark className={`w-[17px] h-[17px] ${saved ? 'fill-current' : ''}`} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <ClassQuickFacts cls={cls} isExpired={isExpired} />

            <div className="mt-5 lg:mt-0 mb-4 lg:mb-6 min-w-0">
              <div className="flex gap-1.5 mb-2 lg:hidden">
                <span className="badge-black text-[11px]">{getTypeLabel(cls.type)}</span>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-primary-bg text-primary-dark whitespace-nowrap">
                  {cls.style}
                </span>
              </div>
              <h1 className="text-[24px] lg:text-[30px] font-black text-neutral-900 tracking-snug leading-[1.15] lg:leading-tight mb-1.5 lg:mb-2 break-words">{cls.title}</h1>
              <p data-testid="title-by" className="lg:hidden text-[14px] text-neutral-500 break-words">
                por{' '}
                <Link href={getProfileUrl(cls.teacher)} onClick={selectTeacherProfile} className="font-bold text-neutral-900 underline underline-offset-[3px]">
                  {cls.teacher.name}
                </Link>
              </p>
              <div className="hidden lg:flex flex-wrap items-center gap-3 text-[15px] text-neutral-600">
                <span className="font-semibold text-primary bg-primary-bg border border-primary-bg px-2.5 py-0.5 rounded-full text-[13px]">
                  Nivel {cls.level}
                </span>
                <span>·</span>
                <Link href={getProfileUrl(cls.teacher)} onClick={selectTeacherProfile} className="hover:text-neutral-900 font-medium transition-colors hover:underline break-words">
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

            {/* Solo mobile: chips de nivel/modalidad, fila de la academia y aviso de clase finalizada */}
            <div data-testid="detail-chips" className="lg:hidden flex flex-wrap gap-2 mb-3.5">
              {detailChips(cls).map(c => (
                <span
                  key={c.label}
                  className={`h-8 px-3 rounded-full border flex items-center text-[13px] font-semibold ${
                    c.tone === 'green' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-neutral-200 text-neutral-900'
                  }`}
                >
                  {c.label}
                </span>
              ))}
            </div>
            <Link
              data-testid="teacher-row"
              href={getProfileUrl(cls.teacher)}
              onClick={selectTeacherProfile}
              className="lg:hidden flex items-center gap-3 p-3 mb-6 rounded-2xl border border-neutral-200 active:bg-neutral-50 transition-colors"
            >
              {cls.teacher.photo ? (
                <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0">
                  <SmartImage src={cls.teacher.photo} alt="" fill sizes="44px" className="object-cover" style={{ objectPosition: cls.teacher.photoPosition || '50% 50%', transform: `scale(${cls.teacher.photoZoom || 1})` }} />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-xl bg-primary-bg text-primary-dark flex items-center justify-center font-extrabold text-[15px] shrink-0">
                  {cls.teacher.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0 leading-snug">
                <p className="font-bold text-neutral-900 text-[14.5px] truncate">{cls.teacher.name}</p>
                <p className="text-[12.5px] text-neutral-500 truncate">
                  {cls.teacher.type === 'academia' ? 'Academia' : 'Profesor'} · {formatExperience(cls.teacher.experience)} de experiencia
                  {cls.teacher.rating ? ` · ★ ${cls.teacher.rating}` : ''}
                </p>
              </div>
              <ChevronRight className="w-[18px] h-[18px] text-neutral-500 shrink-0" aria-hidden="true" />
            </Link>
            {isExpired && <div data-testid="expired-notice-mobile" className="lg:hidden">{expiredBanner}</div>}

            <div className="mb-6 lg:mb-8 min-w-0">
              <h2 className="lg:hidden font-extrabold text-neutral-900 text-[18px] mb-2">Sobre esta clase</h2>
              <ClampedText text={cls.fullDescription} className="text-[14.5px] lg:text-[15px] text-neutral-600 leading-relaxed" />
            </div>

            <ClassPrepList cls={cls} />

            {cls.whatYouLearn && cls.whatYouLearn.length > 0 && (
              <div className="hidden lg:block mb-8">
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
              <div className="hidden lg:grid mb-8 sm:grid-cols-2 gap-3">
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
              <div className="hidden lg:block mb-8">
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
              <h2 className="font-bold text-neutral-900 text-[17px] mb-4">
                {cls.teacher.type === 'academia' ? 'Sobre la academia' : 'Sobre el profesor'}
              </h2>
              <div className="flex items-center gap-3.5 mb-4">
                <Link href={getProfileUrl(cls.teacher)} onClick={selectTeacherProfile} className="shrink-0">
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
                  <Link href={getProfileUrl(cls.teacher)} onClick={selectTeacherProfile} className="font-bold text-neutral-900 hover:underline transition-colors text-[15px] break-words block leading-snug">
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
                    <InstagramIcon className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{formatSocialHandle(cls.teacher.instagram, 'instagram')}</span>
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
                    <TikTokIcon className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{formatSocialHandle(cls.teacher.tiktok, 'tiktok')}</span>
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
              <div className="hidden lg:block border-2 border-neutral-200 rounded-lg p-6 shadow-sm">
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
                  {isExpired ? (
                    <div className="flex items-center gap-2.5 text-[13px] font-medium text-neutral-500">
                      <Calendar className="w-4 h-4 text-neutral-400 shrink-0" />
                      <span>
                        {cls.endDate
                          ? `Finalizó el ${formatFriendlyDate(cls.endDate)}`
                          : cls.startDate
                            ? `Inició el ${formatFriendlyDate(cls.startDate)}`
                            : 'Clase finalizada'}
                      </span>
                    </div>
                  ) : (
                    cls.startDate && (
                      <div className="flex items-center gap-2.5 text-[13px] font-semibold text-neutral-900">
                        <Calendar className="w-4 h-4 text-primary shrink-0" />
                        <span>Inicia {formatFriendlyDate(cls.startDate)}</span>
                      </div>
                    )
                  )}
                  {!isExpired && cls.teacher.showSpots && spotsLeft !== undefined && spotsLeft > 0 && (
                    <div className="flex items-center gap-2.5 text-[13px] text-neutral-600">
                      <Users className="w-4 h-4 text-neutral-400 shrink-0" />
                      <span>
                        <strong className={spotsLeft <= 3 ? 'text-yellow-dark' : 'text-neutral-900'}>{spotsLeft}</strong> cupos disponibles
                        {cls.maxSpots && <span className="text-neutral-400"> de {cls.maxSpots}</span>}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mb-5 flex flex-wrap items-center gap-2">
                  {isExpired && (
                    <span className="badge-gray">
                      Finalizada
                    </span>
                  )}
                  <span className="badge-gray capitalize">{cls.modality}</span>
                  {!isExpired && isFullyBooked && <span className="badge-gray">Sin cupos</span>}
                  <span className="badge-gray capitalize">Nivel {cls.level}</span>
                </div>

                <div className="flex flex-col gap-2">
                  {showWa && (
                    <button
                      onClick={handleWhatsAppClick}
                      disabled={!isExpired && isFullyBooked}
                      className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-btn transition-[background-color,border-color] active:scale-[0.97] text-[15px] border-2 ${
                        !isExpired && isFullyBooked
                          ? 'bg-neutral-100 border-neutral-100 text-neutral-400 cursor-not-allowed'
                          : 'bg-whatsapp border-whatsapp hover:bg-whatsapp-dark hover:border-whatsapp-dark text-white'
                      }`}
                    >
                      {justContacted === 'whatsapp' ? <Check className="w-4 h-4 animate-fade-in" /> : <MessageCircle className="w-4 h-4" />}
                      {!isExpired && isFullyBooked ? 'Sin cupos' : justContacted === 'whatsapp' ? 'Abriendo…' : 'WhatsApp'}
                    </button>
                  )}

                  {showIg && (
                    <button
                      onClick={handleInstagramClick}
                      disabled={!isExpired && isFullyBooked}
                      className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-btn transition-[background-color,border-color] active:scale-[0.97] text-[15px] border-2 ${
                        !isExpired && isFullyBooked
                          ? 'bg-neutral-100 border-neutral-100 text-neutral-400 cursor-not-allowed'
                          : 'bg-instagram border-instagram hover:bg-instagram-dark hover:border-instagram-dark text-white'
                      }`}
                    >
                      {justContacted === 'instagram' ? <Check className="w-4 h-4 animate-fade-in" /> : <InstagramIcon className="w-4 h-4" />}
                      {!isExpired && isFullyBooked ? 'Sin cupos' : justContacted === 'instagram' ? 'Abriendo…' : 'Instagram'}
                    </button>
                  )}

                  {!isExpired && (
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
                  )}
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

            {/* Solo mobile: mapa y dirección en una sola tarjeta. El recuadro del mapa bajo la foto baja hasta acá (#donde-es). */}
            {(hasCoords || cls.venueName || cls.address) && (
              <section id="donde-es" className="lg:hidden mt-6 scroll-mt-4 min-w-0">
                <h2 className="font-extrabold text-neutral-900 text-[18px] mb-2.5">Dónde es</h2>
                <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                  {hasCoords && (
                    <div className="[&>*]:rounded-none! [&>*]:border-0! [&>*]:border-b! [&>*]:border-neutral-200!">
                      <MapPreview lat={cls.lat!} lng={cls.lng!} label={`${cls.district}, ${cls.city}`} previewImageUrl={cls.mapImageUrl} className="h-[150px]" />
                    </div>
                  )}
                  <div className="p-3.5 leading-snug min-w-0">
                    {cls.venueName && <p className="font-bold text-neutral-900 text-[14.5px] break-words">{cls.venueName}</p>}
                    {/* Locales viejos tenían la dirección como nombre: no repetirla. */}
                    {cls.address && cls.address !== cls.venueName && (
                      <p className="text-[13px] text-neutral-600 break-words [overflow-wrap:anywhere]">{cls.address}</p>
                    )}
                    {cls.reference && <p className="text-[13px] text-neutral-500 break-words [overflow-wrap:anywhere]">{cls.reference}</p>}
                    {mapsHref && (
                      <a
                        href={mapsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2.5 inline-flex items-center gap-1.5 text-[13.5px] font-extrabold text-primary"
                      >
                        <Navigation className="w-[15px] h-[15px]" aria-hidden="true" /> Cómo llegar
                      </a>
                    )}
                  </div>
                </div>
              </section>
            )}

            <div data-testid="teacher-card-mobile" className="lg:hidden border border-neutral-200 rounded-2xl p-4 mt-6 mb-2 min-w-0">
              <h2 className="font-extrabold text-neutral-900 text-[18px] mb-3">
                {cls.teacher.type === 'academia' ? 'Sobre la academia' : 'Sobre el profesor'}
              </h2>
              <div className="flex items-center gap-3.5 mb-4">
                <Link href={getProfileUrl(cls.teacher)} onClick={selectTeacherProfile} className="shrink-0">
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
                  <Link href={getProfileUrl(cls.teacher)} onClick={selectTeacherProfile} className="font-bold text-neutral-900 hover:underline transition-colors text-[15px] break-words block leading-snug">
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
                <div className="mb-4">
                  <ClampedText text={cls.teacher.bio} className="text-[13.5px] text-neutral-600 leading-relaxed" />
                </div>
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
                    <InstagramIcon className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{formatSocialHandle(cls.teacher.instagram, 'instagram')}</span>
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
                    <TikTokIcon className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{formatSocialHandle(cls.teacher.tiktok, 'tiktok')}</span>
                  </a>
                )}
                {cls.teacher.website && (
                  <a href={cls.teacher.website} target="_blank" rel="noopener noreferrer" onClick={() => socialClick('website')} className="text-[13px] text-neutral-900 flex items-center gap-1 hover:underline font-medium max-w-full">
                    <Globe className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Sitio web</span>
                  </a>
                )}
              </div>
              <Link
                href={getProfileUrl(cls.teacher)}
                onClick={selectTeacherProfile}
                className="mt-4 h-[42px] rounded-xl border border-neutral-300 flex items-center justify-center text-[14px] font-bold text-neutral-900 active:bg-neutral-50 transition-colors"
              >
                {cls.teacher.type === 'academia' ? 'Ver perfil de la academia' : 'Ver perfil del profesor'}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Mobile sticky bottom CTA */}
      <div data-testid="sticky-bar" className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 px-4 py-3 z-40 flex items-center gap-3">
        <div className="shrink-0 max-w-[42%] min-w-0">
          {isExpired ? (
            <div>
              <span className="badge-gray text-[10px] px-2 py-0.5 mb-1 inline-block">
                Finalizada
              </span>
              <p className="text-[13px] font-bold text-neutral-700 truncate">
                {cls.priceType === 'Gratis' ? 'Gratis' : formatPrice(cls.priceType, cls.price, cls.currency)}
              </p>
            </div>
          ) : (
            <>
              {/* Precio vigente arriba (morado si hay oferta) y el anterior tachado debajo: así no se corta
                  cuando hay dos botones de contacto. El nivel ya está en los chips de arriba. */}
              <p className={`text-[19px] font-black leading-none whitespace-nowrap ${cls.offerPrice && cls.priceType !== 'Gratis' ? 'text-primary' : 'text-neutral-900'}`}>
                {cls.priceType === 'Gratis'
                  ? 'Gratis'
                  : formatPrice(cls.priceType, cls.offerPrice || cls.price, cls.currency)}
              </p>
              {cls.offerPrice && cls.priceType !== 'Gratis' && (
                <p className="text-[12px] text-neutral-400 line-through font-semibold mt-1 whitespace-nowrap">
                  {formatPrice(cls.priceType, cls.price, cls.currency)}
                </p>
              )}
            </>
          )}
        </div>
        {/* Botones a flex-1: cuando hay dos canales activos, se reparten el
            ancho sobrante en vez de encogerse a solo ícono (ver el bloque de
            arriba, que ahora es shrink-0 con un tope de ancho). */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {showWa && (
            <button
              onClick={handleWhatsAppClick}
              disabled={!isExpired && isFullyBooked}
              className={`flex-1 flex items-center justify-center gap-2 font-bold py-3 px-3 rounded-btn text-[14px] transition-colors active:scale-[0.97] ${
                !isExpired && isFullyBooked ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-whatsapp hover:bg-whatsapp-dark text-white'
              }`}
            >
              {justContacted === 'whatsapp' ? <Check className="w-4 h-4 shrink-0 animate-fade-in" /> : <MessageCircle className="w-4 h-4 shrink-0" />}
              <span className="truncate">{!isExpired && isFullyBooked ? 'Sin cupos' : justContacted === 'whatsapp' ? 'Abriendo…' : 'WhatsApp'}</span>
            </button>
          )}
          {showIg && (
            <button
              onClick={handleInstagramClick}
              disabled={!isExpired && isFullyBooked}
              className={`flex-1 flex items-center justify-center gap-2 font-bold py-3 px-3 rounded-btn text-[14px] transition-colors active:scale-[0.97] ${
                !isExpired && isFullyBooked ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-instagram hover:bg-instagram-dark text-white'
              }`}
            >
              {justContacted === 'instagram' ? <Check className="w-4 h-4 shrink-0 animate-fade-in" /> : <InstagramIcon className="w-4 h-4 shrink-0" />}
              <span className="truncate">{!isExpired && isFullyBooked ? 'Sin cupos' : justContacted === 'instagram' ? 'Abriendo…' : 'Instagram'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Extra padding so content isn't hidden behind mobile CTA */}
      <div className="lg:hidden h-20 bg-neutral-900" />

      {copied && (
        <div role="status" className="lg:hidden fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-[13px] font-semibold px-4 py-2 rounded-full shadow-lg animate-fade-in">
          Enlace copiado
        </div>
      )}

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
