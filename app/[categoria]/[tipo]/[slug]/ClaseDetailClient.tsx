'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SmartImage from '@/components/SmartImage';
import { MapPin, Clock, Users, Calendar, MessageCircle, Bookmark, ChevronLeft, ChevronRight, Share2, Navigation, Star, Globe, Check } from 'lucide-react';
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
import ClampedText from '@/components/ClampedText';
import ClassQuickFacts from '@/components/ClassQuickFacts';
import ClassPrepList from '@/components/ClassPrepList';
import ClassEssentials from '@/components/ClassEssentials';
import ClassSchedule from '@/components/ClassSchedule';
import ClassPrepDesktop from '@/components/ClassPrepDesktop';
import { detailChips, detailVenueTile, detailWhenTile } from '@/lib/classes/detailInfo';

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

  const venueLine = cls.venueName || cls.district ? detailVenueTile(cls) : null;
  const chips = detailChips(cls, { showSpots: cls.teacher.showSpots, isExpired });
  const when = detailWhenTile(cls, isExpired);
  const firstSlot = cls.timeSlots?.[0];
  const extraSlots = (cls.timeSlots?.length ?? 0) - 1;
  const spotsInfo = !isExpired && cls.teacher.showSpots && spotsLeft !== undefined && spotsLeft > 0;
  const isAcademia = cls.teacher.type === 'academia';

  return (
    <div className="min-h-screen bg-white overflow-x-clip">
      {/* En mobile la foto va a sangre con sus propios botones (atrás, compartir, guardar): sin header. */}
      <Header className="max-lg:hidden" />

      <div className="max-w-[640px] lg:max-w-[1200px] mx-auto px-4 lg:px-6 pt-0 pb-8 lg:py-8 w-full min-w-0">
        {/* Desktop: migas de pan y compartir / guardar */}
        <div className="hidden lg:flex items-center justify-between gap-6 mb-6">
          <nav aria-label="Migas de pan" className="flex items-center gap-1.5 text-[13px] text-neutral-500 min-w-0">
            <Link href="/" className="hover:text-neutral-900 transition-colors shrink-0">Inicio</Link>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <Link href="/clases" className="hover:text-neutral-900 transition-colors shrink-0">Clases</Link>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <Link href={`/clases?estilo=${encodeURIComponent(cls.style)}`} className="hover:text-neutral-900 transition-colors shrink-0">{cls.style}</Link>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="text-neutral-900 font-medium truncate">{cls.title}</span>
          </nav>
          <div className="flex items-center gap-5 shrink-0">
            <button type="button" onClick={handleShare} className="flex items-center gap-1.5 text-[13.5px] font-bold text-neutral-900 underline underline-offset-[3px] hover:text-primary transition-colors">
              <Share2 className="w-4 h-4" aria-hidden="true" /> Compartir
            </button>
            {!isExpired && (
              <button type="button" onClick={toggleSave} disabled={saving} className="flex items-center gap-1.5 text-[13.5px] font-bold text-neutral-900 underline underline-offset-[3px] hover:text-primary transition-colors disabled:opacity-60">
                <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} aria-hidden="true" /> {saved ? 'Guardado' : 'Guardar'}
              </button>
            )}
          </div>
        </div>

        {isExpired && <div className="hidden lg:block">{expiredBanner}</div>}

        <div className="grid lg:grid-cols-[1fr_360px] gap-0 lg:gap-10">
          {/* LEFT COLUMN */}
          <div className="min-w-0">
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
              {isExpired && (
                <div className="hidden lg:flex absolute top-4 left-4">
                  <span className="badge-gray text-[11px] shadow-xs">Finalizada</span>
                </div>
              )}
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

            {/* Título: etiquetas arriba, título y, en mobile, "por <academia>"; en desktop la línea del local */}
            <div className="mt-5 lg:mt-0 mb-4 lg:mb-5 min-w-0">
              <div className="flex gap-1.5 mb-2">
                <span className="badge-black text-[11px]">{getTypeLabel(cls.type)}</span>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-primary-bg text-primary-dark whitespace-nowrap">
                  {cls.style}
                </span>
              </div>
              <h1 className="text-[24px] lg:text-[32px] font-black text-neutral-900 tracking-snug leading-[1.15] lg:leading-tight mb-1.5 lg:mb-2 break-words">{cls.title}</h1>
              <p data-testid="title-by" className="lg:hidden text-[14px] text-neutral-500 break-words">
                por{' '}
                <Link href={getProfileUrl(cls.teacher)} onClick={selectTeacherProfile} className="font-bold text-neutral-900 underline underline-offset-[3px]">
                  {cls.teacher.name}
                </Link>
              </p>
              {venueLine && (
                <p data-testid="title-venue" className="hidden lg:flex items-center gap-1.5 text-[15px] text-neutral-600 min-w-0">
                  <MapPin className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span className="truncate">{[venueLine.title, venueLine.sub].filter(Boolean).join(' · ')}</span>
                </p>
              )}
            </div>

            {/* Chips (nivel, modalidad, cupos informativos, 1.ª clase gratis) y fila de la academia */}
            <div data-testid="detail-chips" className="flex flex-wrap gap-2 mb-3.5 lg:mb-4">
              {chips.map(c => (
                <span
                  key={c.label}
                  className={`h-8 px-3 rounded-full border flex items-center text-[13px] font-semibold ${c.mobileOnly ? 'lg:hidden' : ''} ${
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
              className="flex items-center gap-3 p-3 lg:p-4 mb-6 lg:mb-8 rounded-2xl border border-neutral-200 active:bg-neutral-50 lg:hover:bg-neutral-50 transition-colors"
            >
              {cls.teacher.photo ? (
                <div className="relative w-11 h-11 lg:w-12 lg:h-12 rounded-xl overflow-hidden shrink-0">
                  <SmartImage src={cls.teacher.photo} alt="" fill sizes="48px" className="object-cover" style={{ objectPosition: cls.teacher.photoPosition || '50% 50%', transform: `scale(${cls.teacher.photoZoom || 1})` }} />
                </div>
              ) : (
                <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-xl bg-primary-bg text-primary-dark flex items-center justify-center font-extrabold text-[15px] shrink-0">
                  {cls.teacher.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0 leading-snug">
                <p className="font-bold text-neutral-900 text-[14.5px] lg:text-[15px] truncate">{cls.teacher.name}</p>
                <p className="text-[12.5px] lg:text-[13px] text-neutral-500 truncate">
                  {isAcademia ? 'Academia' : 'Profesor'} · {formatExperience(cls.teacher.experience)} de experiencia
                  {cls.teacher.rating ? ` · ★ ${cls.teacher.rating}` : ''}
                </p>
              </div>
              <ChevronRight className="lg:hidden w-[18px] h-[18px] text-neutral-500 shrink-0" aria-hidden="true" />
              <span className="hidden lg:inline text-[14px] font-bold text-neutral-900 underline underline-offset-[3px] shrink-0">Ver perfil</span>
            </Link>
            {isExpired && <div data-testid="expired-notice-mobile" className="lg:hidden">{expiredBanner}</div>}

            <ClassEssentials cls={cls} isExpired={isExpired} />

            <section className="mb-6 lg:mb-8 min-w-0 lg:pt-8 lg:border-t lg:border-neutral-100">
              <h2 className="font-extrabold text-neutral-900 text-[18px] lg:text-[20px] mb-2 lg:mb-3">Sobre esta clase</h2>
              <ClampedText text={cls.fullDescription} className="text-[14.5px] lg:text-[15px] text-neutral-600 leading-relaxed" />
            </section>

            <ClassPrepList cls={cls} />
            <ClassSchedule cls={cls} />
            <ClassPrepDesktop cls={cls} />

            {/* Dónde es: mapa y dirección en una sola tarjeta. El recuadro del mapa bajo la foto (mobile) baja hasta acá. */}
            {(hasCoords || cls.venueName || cls.address) && (
              <section id="donde-es" className="mt-6 lg:mt-0 mb-2 lg:mb-8 lg:pt-8 lg:border-t lg:border-neutral-100 scroll-mt-4 min-w-0">
                <h2 className="font-extrabold text-neutral-900 text-[18px] lg:text-[20px] mb-2.5 lg:mb-4">Dónde es</h2>
                <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                  {hasCoords && (
                    <div className="[&>*]:rounded-none! [&>*]:border-0! [&>*]:border-b! [&>*]:border-neutral-200!">
                      <MapPreview lat={cls.lat!} lng={cls.lng!} label={`${cls.district}, ${cls.city}`} previewImageUrl={cls.mapImageUrl} className="h-[150px] lg:h-[300px]" />
                    </div>
                  )}
                  <div className="p-3.5 lg:p-4 leading-snug min-w-0 lg:flex lg:items-center lg:justify-between lg:gap-4">
                    <div className="min-w-0">
                      {cls.venueName && <p className="font-bold text-neutral-900 text-[14.5px] lg:text-[15px] break-words">{cls.venueName}</p>}
                      {/* Locales viejos tenían la dirección como nombre: no repetirla. */}
                      {cls.address && cls.address !== cls.venueName && (
                        <p className="text-[13px] text-neutral-600 break-words [overflow-wrap:anywhere]">{cls.address}</p>
                      )}
                      {cls.reference && <p className="text-[13px] text-neutral-500 break-words [overflow-wrap:anywhere]">{cls.reference}</p>}
                    </div>
                    {mapsHref && (
                      <a
                        href={mapsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2.5 lg:mt-0 inline-flex items-center gap-1.5 text-[13.5px] font-extrabold text-primary lg:text-neutral-900 lg:h-10 lg:px-4 lg:rounded-btn lg:border lg:border-neutral-900 lg:hover:bg-neutral-50 lg:transition-colors shrink-0"
                      >
                        <Navigation className="w-[15px] h-[15px]" aria-hidden="true" /> Cómo llegar
                      </a>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Sobre la academia / el profesor */}
            <section data-testid="teacher-card" className="mt-6 lg:mt-0 mb-2 lg:mb-0 lg:pt-8 lg:border-t lg:border-neutral-100 min-w-0">
              <h2 className="font-extrabold text-neutral-900 text-[18px] lg:text-[20px] mb-3 lg:mb-4">
                {isAcademia ? 'Sobre la academia' : 'Sobre el profesor'}
              </h2>
              <div className="border border-neutral-200 rounded-2xl p-4 lg:p-6 min-w-0">
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
                    <ClampedText text={cls.teacher.bio} className="text-[13.5px] lg:text-[14px] text-neutral-600 leading-relaxed" />
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
                  className="mt-4 h-[42px] lg:self-start lg:inline-flex lg:px-6 rounded-xl border border-neutral-300 flex items-center justify-center text-[14px] font-bold text-neutral-900 active:bg-neutral-50 lg:hover:bg-neutral-50 transition-colors"
                >
                  {isAcademia ? 'Ver perfil de la academia' : 'Ver perfil del profesor'}
                </Link>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: tarjeta de reserva (solo desktop; en mobile lo cubren los recuadros y la barra fija) */}
          <div className="hidden lg:block min-w-0">
            <div className="lg:sticky lg:top-24">
              <div className="border-2 border-neutral-200 rounded-2xl p-6 shadow-sm">
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

                {isExpired && (
                  <span className="badge-gray mb-4 inline-block">Finalizada</span>
                )}

                {/* Inicio y horario, cada uno con su etiqueta */}
                {(when?.date || firstSlot) && (
                  <div data-testid="booking-when" className="mb-4 rounded-xl border border-neutral-200 divide-y divide-neutral-200">
                    {when?.date && (
                      <div className="flex items-center gap-3 px-4 py-3">
                        <Calendar className="w-[18px] h-[18px] text-primary shrink-0" aria-hidden="true" />
                        <div className="leading-tight min-w-0">
                          <p className="text-[10.5px] font-extrabold tracking-[0.07em] text-neutral-500">{when.date.label}</p>
                          <p className="font-bold text-neutral-900 text-[14.5px]">{when.date.big}</p>
                        </div>
                      </div>
                    )}
                    {firstSlot && (
                      <div className="flex items-center gap-3 px-4 py-3">
                        <Clock className="w-[18px] h-[18px] text-primary shrink-0" aria-hidden="true" />
                        <div className="leading-tight min-w-0">
                          <p className="text-[10.5px] font-extrabold tracking-[0.07em] text-neutral-500">HORARIO</p>
                          <p className="font-bold text-neutral-900 text-[14.5px]">
                            {formatTimeSlots([firstSlot])}{extraSlots > 0 ? ` +${extraSlots} más` : ''}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Cupos: solo informativos (sin barra de progreso) y solo si el profesor eligió mostrarlos */}
                {spotsInfo && (
                  <div className="mb-5 flex items-center gap-2.5 text-[13px] text-neutral-600">
                    <Users className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span>
                      <strong className={spotsLeft! <= 3 ? 'text-yellow-dark' : 'text-neutral-900'}>{spotsLeft}</strong> cupos disponibles
                      {cls.maxSpots && <span className="text-neutral-400"> de {cls.maxSpots}</span>}
                    </span>
                  </div>
                )}

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
              </div>
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
