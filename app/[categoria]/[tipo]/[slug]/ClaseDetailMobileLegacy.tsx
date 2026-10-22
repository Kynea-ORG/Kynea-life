'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SmartImage from '@/components/SmartImage';
import { MapPin, Clock, Users, Calendar, MessageCircle, Bookmark, ChevronLeft, ChevronRight, Share2, Navigation, Star, Globe, Check, UserCheck, ClipboardCheck, Footprints, Shirt, Package, GraduationCap, Backpack } from 'lucide-react';
import { InstagramIcon, TikTokIcon } from '@/components/icons/SocialIcons';
import Footer from '@/components/Footer';
import ContactModal from '@/components/ContactModal';
import MapPreview from '@/components/MapPreview';
import { getTypeLabel, formatPrice, formatExperience, formatFriendlyDate, formatTimeSlots, buildWhatsAppMessage, buildGoogleMapsUrl, buildInstagramUrl, buildTikTokUrl, formatSocialHandle, getProfileUrl } from '@/lib/utils';
import type { DanceClass } from '@/lib/types';
import { isClassExpired } from '@/lib/classes/helpers';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { detailVenueTile, detailWhenTile } from '@/lib/classes/detailInfo';
import { useSavedClass } from '@/lib/hooks/useSavedClass';
import { trackGenerateLead, trackTeacherSocialClick, trackSelectProfile } from '@/lib/analytics';
import ClampedText from '@/components/ClampedText';

/**
 * Diseño de detalle de clase de ANTES del rediseño mobile de David (commit fbab895).
 * Solo se muestra en mobile (< lg); desktop usa ClaseDetailDesktop en ClaseDetailClient.tsx.
 * El tracking de vista (view_item / increment_class_views) vive en la versión desktop,
 * que siempre está montada, para no contarlo dos veces.
 */
export default function ClaseDetailMobileLegacy({ cls }: { cls: DanceClass }) {
  const isExpired = isClassExpired(cls);
  const [showContact, setShowContact] = useState(false);
  const [contactType, setContactType] = useState<'whatsapp' | 'instagram'>('whatsapp');
  const { saved, toggleSave } = useSavedClass({ cls, requireAuth: true });
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [justContacted, setJustContacted] = useState<'whatsapp' | 'instagram' | null>(null);

  const contactMode = cls.contactMode ?? 'whatsapp';
  const showWa = contactMode === 'whatsapp' || contactMode === 'both';
  const showIg = contactMode === 'instagram' || contactMode === 'both';

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

  // El botón "atrás" de la foto vuelve a donde estaba la persona (lista con sus filtros, Home…).
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

  const hasCoords = cls.lat != null && cls.lng != null;
  const venueLine = cls.venueName || cls.district ? detailVenueTile(cls) : null;
  const when = detailWhenTile(cls, isExpired);
  const firstSlot = cls.timeSlots?.[0];
  const extraSlots = (cls.timeSlots?.length ?? 0) - 1;
  const spotsInfo = !isExpired && cls.teacher.showSpots && cls.availableSpots !== undefined && cls.availableSpots > 0;
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
    <div className="lg:hidden min-h-screen bg-white overflow-x-clip">
      {/* La foto va a sangre con sus propios botones (atrás, compartir, guardar): sin header. */}
        <div data-testid="legacy-hero" className="relative overflow-hidden h-[280px] isolate">
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
          <div className="absolute bottom-10 left-4 flex gap-2 flex-wrap">
            {isExpired && (
              <span className="badge-gray text-[11px] shadow-xs">
                Finalizada
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="absolute bottom-10 right-4 flex gap-1.5">
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
                aria-label={saved ? 'Guardado' : 'Guardar clase'}
                className="w-9 h-9 rounded-full bg-white/95 text-neutral-900 flex items-center justify-center active:scale-95 transition-transform"
              >
                <Bookmark className={`w-[17px] h-[17px] ${saved ? 'fill-current animate-pop' : ''}`} />
              </button>
            )}
          </div>
        </div>

      {/* Todo lo que no es la foto va en una tarjeta flotante con bordes superiores redondeados, montada sobre la foto. */}
      <div data-testid="legacy-sheet" className="relative z-10 -mt-6 rounded-t-3xl bg-white shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.12)]">
      <div className="max-w-[640px] mx-auto px-4 pt-6 pb-8 w-full min-w-0">
        <div className="grid">
          {/* LEFT COLUMN */}
          <div className="min-w-0">
            {isExpired && (
              <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-neutral-100 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            )}


            {/* Título: etiquetas (tipo, estilo, nivel) arriba, título y "por <academia / profesor>" */}
            <div className="mb-8 min-w-0">
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className="badge-black text-[11px]">{getTypeLabel(cls.type)}</span>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-primary-bg text-primary-dark whitespace-nowrap">
                  {cls.style}
                </span>
                {cls.level && (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md border border-neutral-200 bg-white text-neutral-800 whitespace-nowrap">
                    Nivel {cls.level}
                  </span>
                )}
              </div>
              <h1 className="text-[30px] font-black text-neutral-900 tracking-snug leading-tight mb-2 break-words">{cls.title}</h1>
              <p data-testid="legacy-title-by" className="text-[13px] text-neutral-500 break-words">
                por{' '}
                <Link href={getProfileUrl(cls.teacher)} onClick={selectTeacherProfile} className="font-medium text-neutral-700 underline underline-offset-2 hover:text-primary transition-colors">
                  {cls.teacher.name}
                </Link>
              </p>
              {/* Precio con jerarquía propia (el dato más importante después del título), debajo de "por <nombre>"; con oferta, el vigente en morado y el anterior tachado al lado */}
              <p data-testid="legacy-title-price" className="flex items-baseline gap-2.5 mt-4">
                {cls.priceType === 'Gratis' ? (
                  <span className="text-[34px] leading-none tracking-snug font-black text-neutral-900">Gratis</span>
                ) : cls.offerPrice ? (
                  <>
                    <span className="text-[34px] leading-none tracking-snug font-black text-primary">{formatPrice(cls.priceType, cls.offerPrice, cls.currency)}</span>
                    <span className="text-[18px] text-neutral-400 line-through font-semibold">{formatPrice(cls.priceType, cls.price, cls.currency)}</span>
                  </>
                ) : (
                  <span className="text-[34px] leading-none tracking-snug font-black text-neutral-900">{formatPrice(cls.priceType, cls.price, cls.currency)}</span>
                )}
              </p>
            </div>

            <section className="mb-8 min-w-0">
              <h2 className="font-extrabold text-neutral-900 text-[18px] mb-3">Sobre esta clase</h2>
              <ClampedText text={cls.fullDescription} className="text-[14.5px] text-neutral-600 leading-relaxed" />
            </section>

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

            {/* Dónde es: mapa y dirección en una sola tarjeta */}
            {(hasCoords || cls.venueName || cls.address) && (
              <section id="donde-es-mobile" className="mb-8 scroll-mt-4 min-w-0">
                <h2 className="font-extrabold text-neutral-900 text-[18px] mb-3">Dónde es</h2>
                <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                  {hasCoords && (
                    <div className="[&>*]:rounded-none! [&>*]:border-0! [&>*]:border-b! [&>*]:border-neutral-200!">
                      <MapPreview lat={cls.lat!} lng={cls.lng!} label={`${cls.district}, ${cls.city}`} previewImageUrl={cls.mapImageUrl} className="h-[150px]" />
                    </div>
                  )}
                  <div className="p-3.5 leading-snug min-w-0">
                    <div className="min-w-0">
                      {cls.venueName && <p className="font-bold text-neutral-900 text-[14.5px] break-words">{cls.venueName}</p>}
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
                        className="mt-2.5 inline-flex items-center gap-1.5 text-[13.5px] font-extrabold text-primary shrink-0"
                      >
                        <Navigation className="w-[15px] h-[15px]" aria-hidden="true" /> Cómo llegar
                      </a>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Sobre la academia / el profesor */}
            <section data-testid="legacy-teacher-card" className="mb-8 min-w-0">
              <h2 className="font-extrabold text-neutral-900 text-[18px] mb-3">
                {cls.teacher.type === 'academia' ? 'Sobre la academia' : 'Sobre el profesor'}
              </h2>
              <div className="border border-neutral-200 rounded-2xl p-4 min-w-0">
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
            </section>
          </div>

          {/* Resumen: tarjeta de reserva, misma que en desktop */}
          <div className="min-w-0">
            <h2 className="font-extrabold text-neutral-900 text-[18px] mb-3">Resumen</h2>
            <div>
              <div className="border-2 border-neutral-200 rounded-2xl p-6 shadow-sm bg-white">
                {/* Chips de tipo, disciplina, nivel y modalidad arriba del precio (mismo orden y estilos que en el encabezado principal) */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
                  {cls.type && (
                    <span className="badge-black text-[11px] px-2.5 py-0.5 rounded-md">
                      {getTypeLabel(cls.type)}
                    </span>
                  )}
                  {cls.style && (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-primary-bg text-primary-dark whitespace-nowrap">
                      {cls.style}
                    </span>
                  )}
                  {cls.level && (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-neutral-200 bg-white text-neutral-800 whitespace-nowrap">
                      Nivel {cls.level}
                    </span>
                  )}
                  {cls.modality && (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-neutral-200 bg-white text-neutral-800 whitespace-nowrap">
                      {cls.modality}
                    </span>
                  )}
                  {cls.forWhom && (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-neutral-200 bg-white text-neutral-800 whitespace-nowrap">
                      {cls.forWhom}
                    </span>
                  )}
                </div>

                {/* Precio en el tope con autoría integrada sutil */}
                <div className="mb-4">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <div>
                      {typeof priceDisplay === 'string' ? (
                        <span className="text-[30px] font-black text-neutral-900 tracking-snug">{priceDisplay}</span>
                      ) : priceDisplay}
                    </div>
                    {cls.isTrialFree && (
                      <span className="badge-green text-[11px]">1ra clase gratis</span>
                    )}
                  </div>
                  <Link
                    href={getProfileUrl(cls.teacher)}
                    onClick={selectTeacherProfile}
                    data-testid="legacy-sidebar-teacher"
                    className="inline-flex items-center gap-1 text-[13.5px] text-neutral-500 hover:text-primary transition-colors group"
                  >
                    <span>por <strong className="font-semibold text-neutral-800 group-hover:text-primary group-hover:underline">{cls.teacher.name}</strong></span>
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-primary transition-colors shrink-0" />
                  </Link>
                </div>

                {isExpired && (
                  <span className="badge-gray mb-4 inline-block">Finalizada</span>
                )}

                {/* Bloque logístico */}
                {(when?.date || firstSlot || venueLine || cls.modality === 'Online') && (
                  <div data-testid="legacy-booking-when" className="mb-4 rounded-xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden bg-white">
                    {when?.date && (
                      <div className="flex items-center gap-3 px-3.5 py-2.5">
                        <Calendar className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                        <span className="text-[13.5px] font-semibold text-neutral-900 truncate">
                          <span className="sr-only">INICIA</span>Inicia el {when.date.big}
                        </span>
                      </div>
                    )}
                    {firstSlot && (
                      <div className="flex items-center gap-3 px-3.5 py-2.5">
                        <Clock className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                        <span className="text-[13.5px] font-semibold text-neutral-900 truncate">
                          <span className="sr-only">HORARIO</span>{formatTimeSlots([firstSlot])}{extraSlots > 0 ? ` +${extraSlots} más` : ''}
                        </span>
                      </div>
                    )}
                    {venueLine && (
                      <button
                        type="button"
                        onClick={() => document.getElementById('donde-es-mobile')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 w-full hover:bg-neutral-50 transition-colors group cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <MapPin className="w-4 h-4 text-primary shrink-0 group-hover:scale-110 transition-transform" aria-hidden="true" />
                          <span className="text-[13.5px] font-semibold text-neutral-900 truncate">
                            <span className="sr-only">LUGAR</span>{[venueLine.title, venueLine.sub].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-700 shrink-0" aria-hidden="true" />
                      </button>
                    )}
                    {!venueLine && cls.modality === 'Online' && (
                      <div className="flex items-center gap-3 px-3.5 py-2.5">
                        <Globe className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                        <span className="text-[13.5px] font-semibold text-neutral-900 truncate">
                          <span className="sr-only">MODALIDAD</span>Online en vivo
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Cupos */}
                {spotsInfo && (
                  <div className="mb-5 flex items-center gap-2.5 text-[13px] text-neutral-600">
                    <Users className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span>
                      <strong className={spotsLeft! <= 3 ? 'text-yellow-dark' : 'text-neutral-900'}>{spotsLeft}</strong> cupos disponibles
                      {cls.maxSpots && <span className="text-neutral-400"> de {cls.maxSpots}</span>}
                    </span>
                  </div>
                )}

                {/* Acciones */}
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
                      type="button"
                      onClick={toggleSave}
                      className={`w-full flex items-center justify-center gap-2 text-[15px] font-semibold py-3 rounded-btn border border-neutral-900 transition-[background-color,color] active:scale-[0.97] ${
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
      </div>

      <Footer />

      {/* Mobile sticky bottom CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 px-4 py-3 z-40 flex items-center gap-3">
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
        <div role="status" className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-[13px] font-semibold px-4 py-2 rounded-full shadow-lg animate-fade-in">
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
