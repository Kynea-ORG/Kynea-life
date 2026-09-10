'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import SmartImage from '@/components/SmartImage';
import { ChevronLeft, Star, MapPin, Globe, MessageCircle } from 'lucide-react';
import { InstagramIcon, TikTokIcon } from '@/components/icons/SocialIcons';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ClassCard from '@/components/ClassCard';
import { createClient } from '@/lib/supabase/client';
import { trackGenerateLead, trackViewProfile, trackTeacherSocialClick } from '@/lib/analytics';
import { buildInstagramUrl, buildTikTokUrl, formatExperience, formatPrice, DEFAULT_ACADEMIA_COVER } from '@/lib/utils';
import type { Teacher, DanceClass } from '@/lib/types';
import LinkifiedText from '@/components/LinkifiedText';

export default function ProfesorDetailClient({
  teacher,
  classes,
}: {
  teacher: Teacher;
  classes: DanceClass[];
}) {
  useEffect(() => {
    trackViewProfile({ role: teacher.type, profileId: teacher.id, profileName: teacher.name });
    // Contador propio (dashboard), separado del evento GA4 de arriba — ver
    // increment_profile_views (migración 46). .then() sin await.
    // Deduplicación por sesión: evita incrementar vistas repetidamente en recargas (F5).
    const viewKey = `kynea_viewed_teacher_${teacher.id}`;
    if (!sessionStorage.getItem(viewKey)) {
      sessionStorage.setItem(viewKey, '1');
      createClient().rpc('increment_profile_views', { target_profile_id: teacher.id }).then(() => {}, () => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacher.id]);

  const socialClick = (channel: 'instagram' | 'tiktok' | 'website') =>
    trackTeacherSocialClick({
      channel,
      teacherId: teacher.id,
      teacherName: teacher.name,
      surface: teacher.type === 'academia' ? 'academia_detail' : 'profesor_detail',
    });

  // Ambos roles comparten el mismo tratamiento editorial oscuro — ver
  // ProfesorEditorial más abajo. Academia tenía antes su propio banner con
  // tabs; se unificó tras la propuesta de diseño validada (Notion: "Perfil
  // Academia: rediseño inspirado en Perfil Profesor").
  return <ProfesorEditorial teacher={teacher} classes={classes} socialClick={socialClick} />;
}
function ProfesorEditorial({
  teacher,
  classes,
  socialClick,
}: {
  teacher: Teacher;
  classes: DanceClass[];
  socialClick: (channel: 'instagram' | 'tiktok' | 'website') => void;
}) {
  const cheapestClass = classes.reduce<DanceClass | null>((cheapest, cls) => {
    if (cls.priceType === 'Gratis') return cheapest && cheapest.priceType === 'Gratis' ? cheapest : cls;
    const price = cls.offerPrice ?? cls.price;
    if (!cheapest) return cls;
    const cheapestPrice = cheapest.priceType === 'Gratis' ? 0 : (cheapest.offerPrice ?? cheapest.price);
    return price < cheapestPrice ? cls : cheapest;
  }, null);

  const modalities = Array.from(new Set(classes.map(c => c.modality).filter(Boolean)));
  const modalityLabel =
    modalities.length === 0 ? '—' : modalities.length === 1 ? modalities[0] : 'Presencial y online';
  const cities = Array.from(new Set(classes.map(c => c.city).filter(Boolean)));

  const visibleStyles = teacher.styles.slice(0, 3);
  const isAcademia = teacher.type === 'academia';

  // Profesor no tiene foto de portada propia — reusa su foto de perfil de
  // fondo. Academia sí tiene una (o cae a DEFAULT_ACADEMIA_COVER), así que
  // el banner y el círculo nunca son la misma imagen para ese rol.
  const heroImage = isAcademia ? (teacher.coverImage || DEFAULT_ACADEMIA_COVER) : teacher.photo;

  const priceLabel = cheapestClass
    ? formatPrice(cheapestClass.priceType, cheapestClass.offerPrice ?? cheapestClass.price, cheapestClass.currency)
    : '—';

  // Ficha — mismo componente de ticker para ambos roles, pero las columnas
  // reflejan lo que cada uno realmente tiene: academia muestra sedes/equipo
  // (ya existen en profiles.branch_count/team_size); profesor muestra
  // clases activas/modalidad, que no aplican a una academia con varias sedes.
  const ficha = isAcademia
    ? [
        { label: 'Especialidad', value: teacher.styles.join(' · ') || '—' },
        { label: 'Sedes', value: teacher.branchCount ? `${teacher.branchCount} ${teacher.branchCount === '1' ? 'sede' : 'sedes'}` : '—' },
        { label: 'Equipo', value: teacher.teamSize ? `${teacher.teamSize} profesores` : '—' },
        { label: 'Desde', value: priceLabel },
      ]
    : [
        { label: 'Especialidad', value: teacher.styles.join(' · ') || '—' },
        { label: 'Clases activas', value: `${classes.length} publicadas` },
        { label: 'Modalidad', value: modalityLabel + (cities.length === 1 ? ` · ${cities[0]}` : '') },
        { label: 'Desde', value: priceLabel },
      ];

  return (
    <div
      className="min-h-screen bg-neutral-900 overflow-x-clip"
      style={{
        backgroundImage: 'url(/Background-BK.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Header />

      {/* Hero — un profesor no tiene foto de portada propia, así que reusa
          su propia foto de perfil de fondo; academia siempre tiene una
          (real o DEFAULT_ACADEMIA_COVER), así que nunca cae al respaldo de
          líneas diagonales. Ampliada + blur + oscurecida, con un degradado
          que la disuelve hacia el bg-neutral-900 de la página en vez de
          cortar en seco. La textura Background-BK vive en el fondo de la
          página completa (ver el div exterior más arriba), no acá — así se
          funde con el degradado en vez de competir con la foto/gradientes
          del banner. */}
      <div className={`relative overflow-hidden pt-10 pb-11 md:pb-14 bg-neutral-900 ${!heroImage ? 'pattern-diagonal-lines' : ''}`}>
        {heroImage && (
          <>
            <SmartImage
              src={heroImage}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
              style={{
                objectPosition: (isAcademia ? teacher.coverImagePosition : teacher.photoPosition) || '50% 30%',
                filter: 'blur(40px) brightness(0.5) saturate(1.15)',
                transform: 'scale(1.1)',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-transparent" />
            <div
              className="absolute inset-0 hidden md:block"
              style={{ backgroundImage: 'linear-gradient(to right, #0D0D0D -5%, transparent 24%, transparent 76%, #0D0D0D 105%)' }}
            />
            <div
              className="absolute inset-0"
              style={{ backgroundImage: 'linear-gradient(to bottom, transparent 32%, #0D0D0D 92%)' }}
            />
          </>
        )}
        <div className="relative z-10 max-w-[1200px] mx-auto px-6">
          <Link href="/clases" className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white mb-8 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Volver a clases
          </Link>

          <div className="flex flex-wrap items-start gap-7">
            <div className="relative w-36 h-36 md:w-48 md:h-48 rounded-full overflow-hidden shrink-0 bg-neutral-800 flex items-center justify-center">
              {teacher.photo ? (
                <SmartImage src={teacher.photo} alt={teacher.name} fill sizes="192px" className="object-cover" style={{ objectPosition: teacher.photoPosition || '50% 50%', transform: `scale(${teacher.photoZoom || 1})` }} />
              ) : (
                <span className="text-[56px] font-black text-white/30">{teacher.name.charAt(0)}</span>
              )}
            </div>

            <div className="flex-1 min-w-[260px] pt-2">
              <div className="flex flex-wrap items-center gap-2 mb-3.5">
                {visibleStyles.map(s => (
                  <span key={s} className="border border-white/50 rounded-full px-3.5 py-1 text-xs font-bold text-white">
                    {s}
                  </span>
                ))}
                {teacher.rating && (
                  <span className="inline-flex items-center gap-1 bg-white border border-neutral-900 rounded-full px-3 py-1 text-xs font-bold text-neutral-900">
                    <Star className="w-3 h-3 text-yellow-dark fill-yellow-dark" /> {teacher.rating}
                  </span>
                )}
              </div>
              <h1 className="text-[32px] md:text-[48px] leading-[1] font-black tracking-tight text-white break-words">{teacher.name}</h1>
              <p className="font-figtree text-sm md:text-base text-white/75 mt-2 flex items-center gap-2 flex-wrap">
                {teacher.nationality && (
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {teacher.nationality}</span>
                )}
                {teacher.experience > 0 && (
                  <>
                    {teacher.nationality && <span>·</span>}
                    <span>{formatExperience(teacher.experience)} de experiencia</span>
                  </>
                )}
              </p>

              <div className="flex flex-wrap gap-3 mt-5">
                {teacher.whatsapp && (
                  <a
                    href={`https://wa.me/${teacher.whatsapp.replace(/\s+/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackGenerateLead({ channel: 'whatsapp', teacherId: teacher.id, teacherName: teacher.name })}
                    className="flex items-center gap-2 bg-whatsapp hover:bg-whatsapp-dark text-white font-extrabold text-[14.5px] px-6 py-3 rounded-full transition-colors active:scale-[0.97]"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                )}
                {teacher.instagram && (
                  <a
                    href={buildInstagramUrl(teacher.instagram)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => socialClick('instagram')}
                    className="flex items-center gap-2 bg-white/10 border border-white/30 text-white font-bold text-[14.5px] px-4.5 py-3 rounded-full hover:bg-white/15 transition-colors active:scale-[0.97]"
                  >
                    <InstagramIcon className="w-4 h-4" /> {teacher.instagram}
                  </a>
                )}
                {teacher.tiktok && (
                  <a
                    href={buildTikTokUrl(teacher.tiktok)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => socialClick('tiktok')}
                    className="flex items-center gap-1.5 text-white font-bold text-[14.5px] hover:text-white/80 transition-colors"
                  >
                    <TikTokIcon className="w-3.5 h-3.5" /> {teacher.tiktok}
                  </a>
                )}
                {teacher.website && (
                  <a
                    href={teacher.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => socialClick('website')}
                    className="flex items-center gap-1.5 text-white/80 font-bold text-[14.5px] hover:text-white transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" /> Sitio web
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sobre mí — visible directo, sin heading ni tab. El banner de arriba
          termina en un #0D0D0D sólido (ver su degradado de cierre); acá
          repetimos ese mismo tono desvaneciéndose hacia transparente, a todo
          el ancho de la página (no solo el de este container), para que la
          textura Background-BK del fondo aparezca de a poco en vez de cortar
          en seco justo donde termina el banner. */}
      <div className="relative">
        <div
          className="absolute inset-x-0 top-0 h-24 md:h-32 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(to bottom, #0D0D0D, transparent)' }}
        />
        <div className="relative max-w-[1200px] mx-auto px-6 pt-9 md:pt-11">
          <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-primary mb-3.5">
            {isAcademia ? 'Sobre la academia' : 'Sobre mí'}
          </h2>
          <p className="font-figtree text-base md:text-[16px] leading-relaxed text-white/80 whitespace-pre-line break-words [overflow-wrap:anywhere] max-w-[760px]">
            <LinkifiedText text={teacher.bio || (isAcademia ? 'Esta academia todavía no agregó una descripción.' : 'Este profesor aún no agregó una biografía.')} />
          </p>

          {/* Ubicación — solo academia; un profesor no tiene una sede propia
              que mostrar acá (sus clases sí tienen dirección, pero eso vive
              en cada ClassCard, no en el perfil). */}
          {isAcademia && teacher.venueAddress && (
            <>
              <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-primary mt-7 mb-3">Ubicación</h2>
              <span className="inline-flex items-center gap-1.5 text-sm text-white/75 bg-white/[0.06] border border-white/10 px-3.5 py-2 rounded-xl">
                <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                {[teacher.venueAddress, teacher.venueDistrict, teacher.venueCity].filter(Boolean).join(', ')}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Ficha — ticker de datos reales, columnas según el rol (ver `ficha` más arriba) */}
      <div className="max-w-[1200px] mx-auto px-6 mt-8 md:mt-9">
        <div className="font-figtree grid grid-cols-2 md:flex border-y border-white/10">
          {ficha.map((stat, i) => (
            <div
              key={stat.label}
              className={`py-5 px-4 md:py-[22px] md:px-8 md:flex-1 border-white/10 ${
                i % 2 === 0 ? 'border-r' : ''
              } ${i < ficha.length - 2 ? 'border-b md:border-b-0' : ''} ${i < ficha.length - 1 ? 'md:border-r' : ''}`}
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">{stat.label}</p>
              <p className="text-[15px] md:text-[17px] font-bold text-white mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Clases — visibles directo, sin tab */}
      <div className="max-w-[1200px] mx-auto px-6 pt-9 md:pt-11 pb-14 md:pb-16">
        <h2 className="text-xl md:text-2xl font-black text-white mb-5">Clases ({classes.length})</h2>
        {classes.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
            <p className="text-sm">
              {isAcademia ? 'Esta academia todavía no tiene clases publicadas.' : 'Este profesor no tiene clases publicadas actualmente.'}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {classes.map(cls => <ClassCard key={cls.id} cls={cls} listName="profesor_detail" />)}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
