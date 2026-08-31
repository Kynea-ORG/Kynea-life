'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import SmartImage from '@/components/SmartImage';
import { ChevronLeft, Star, MapPin, Globe, MessageCircle, Users, Building2 } from 'lucide-react';
import { InstagramIcon, TikTokIcon } from '@/components/icons/SocialIcons';
import Header from '@/components/Header';
import ClassCard from '@/components/ClassCard';
import { trackGenerateLead, trackViewProfile, trackTeacherSocialClick } from '@/lib/analytics';
import { buildInstagramUrl, buildTikTokUrl, formatExperience, formatPrice, DEFAULT_ACADEMIA_COVER } from '@/lib/utils';
import type { Teacher, DanceClass } from '@/lib/types';

export default function ProfesorDetailClient({
  teacher,
  classes,
}: {
  teacher: Teacher;
  classes: DanceClass[];
}) {
  const [activeTab, setActiveTab] = useState<'clases' | 'bio'>('clases');

  useEffect(() => {
    trackViewProfile({ role: teacher.type, profileId: teacher.id, profileName: teacher.name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacher.id]);

  const socialClick = (channel: 'instagram' | 'tiktok' | 'website') =>
    trackTeacherSocialClick({ channel, teacherId: teacher.id, teacherName: teacher.name, surface: 'profesor_detail' });

  // Perfil de profesor: editorial oscuro (ver docs de diseño del canvas
  // "Rediseño Perfil de Profesor" — Dirección D). Academia mantiene su
  // propio tratamiento (banner con foto de portada + tabs) sin cambios.
  if (teacher.type === 'profesor') {
    return <ProfesorEditorial teacher={teacher} classes={classes} socialClick={socialClick} />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Banner de academia: foto de portada real bajo un overlay oscuro
          para legibilidad (perfil de profesor usa su propio tratamiento
          editorial — ver ProfesorEditorial más abajo). */}
      <div className="relative overflow-hidden pt-10 px-5 lg:px-8 pb-[88px] bg-neutral-900">
        <SmartImage
          src={teacher.coverImage || DEFAULT_ACADEMIA_COVER}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: teacher.coverImagePosition || '50% 50%', transform: `scale(${teacher.coverImageZoom || 1})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/45 to-black/75" />
        <div className="relative z-10 max-w-5xl mx-auto">
          <Link href="/clases" className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Volver a clases
          </Link>

          <div className="flex flex-wrap items-start gap-6">
            <div className="relative w-40 h-40 rounded-full overflow-hidden shrink-0 bg-neutral-900 flex items-center justify-center">
              {teacher.photo ? (
                <SmartImage src={teacher.photo} alt={teacher.name} fill sizes="160px" className="object-cover" style={{ objectPosition: teacher.photoPosition || '50% 50%', transform: `scale(${teacher.photoZoom || 1})` }} />
              ) : (
                <span className="text-[56px] font-black text-white">{teacher.name.charAt(0)}</span>
              )}
            </div>

            <div className="flex-1 min-w-[260px] pt-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-[30px] font-black text-white tracking-tight">{teacher.name}</h1>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-pink-50 text-pink-600">
                      Academia
                    </span>
                    <span className="font-figtree text-[14px] text-white/75">de danza</span>
                  </div>
                </div>
                {teacher.rating && (
                  <div className="flex items-center gap-1.5 bg-white border border-neutral-900 px-3.5 py-2 rounded-full animate-float-slow-2">
                    <Star className="w-[15px] h-[15px] text-yellow-dark fill-yellow-dark" />
                    <span className="font-bold text-neutral-900 text-sm">{teacher.rating}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2.5 mt-3.5 text-[13px] text-white/75">
                {teacher.nationality && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {teacher.nationality}
                  </span>
                )}
                {teacher.experience > 0 && (
                  <>
                    <span>·</span>
                    <span>{formatExperience(teacher.experience)} de experiencia</span>
                  </>
                )}
                {teacher.totalClasses && (
                  <>
                    <span>·</span>
                    <span>{teacher.totalClasses} clases publicadas</span>
                  </>
                )}
              </div>

              {teacher.styles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3.5">
                  {teacher.styles.map(s => (
                    <span key={s} className="text-xs font-bold bg-white text-primary-dark border border-neutral-900 px-3.5 py-1.5 rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {teacher.venueAddress && (
                <p className="flex items-center gap-1.5 text-[13px] text-white/75 mt-3.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {[teacher.venueAddress, teacher.venueDistrict, teacher.venueCity].filter(Boolean).join(', ')}
                </p>
              )}

              {(teacher.teamSize || teacher.branchCount) && (
                <div className="flex flex-wrap gap-4 mt-2 text-[13px] text-white/75">
                  {teacher.teamSize && (
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> {teacher.teamSize} profesores
                    </span>
                  )}
                  {teacher.branchCount && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" /> {teacher.branchCount} {teacher.branchCount === '1' ? 'sede' : 'sedes'}
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-4 mt-3.5">
                {teacher.instagram && (
                  <a
                    href={buildInstagramUrl(teacher.instagram)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => socialClick('instagram')}
                    className="text-[12.5px] text-white/80 flex items-center gap-1.5 hover:text-white transition-colors"
                  >
                    <InstagramIcon className="w-3.5 h-3.5" /> {teacher.instagram}
                  </a>
                )}
                {teacher.tiktok && (
                  <a
                    href={buildTikTokUrl(teacher.tiktok)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => socialClick('tiktok')}
                    className="text-[12.5px] text-white/80 flex items-center gap-1.5 hover:text-white transition-colors"
                  >
                    <TikTokIcon className="w-3.5 h-3.5" /> {teacher.tiktok}
                  </a>
                )}
                {teacher.website && (
                  <a href={teacher.website} target="_blank" rel="noopener noreferrer" onClick={() => socialClick('website')} className="text-[12.5px] text-white flex items-center gap-1.5 hover:underline font-bold">
                    <Globe className="w-3.5 h-3.5" /> Sitio web
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-neutral-100 rounded-xl p-1 w-fit">
          {[
            { key: 'clases' as const, label: `Clases (${classes.length})` },
            { key: 'bio' as const, label: 'Sobre la academia' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-[background-color,color,box-shadow] active:scale-[0.97] ${
                activeTab === tab.key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'clases' ? (
          classes.length === 0 ? (
            <div className="text-center py-16 text-neutral-400">
              <p className="text-4xl mb-3">🕺</p>
              <p className="text-sm">Esta academia no tiene clases publicadas actualmente.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {classes.map(cls => <ClassCard key={cls.id} cls={cls} listName="profesor_detail" />)}
            </div>
          )
        ) : (
          <div className="max-w-2xl">
            <p className="text-neutral-600 leading-relaxed mb-6">{teacher.bio || 'Sin biografía aún.'}</p>
            {teacher.whatsapp && (
              <div className="bg-neutral-50 rounded-2xl border border-neutral-900 p-6">
                <h3 className="font-extrabold text-neutral-900 mb-2.5">Contacto</h3>
                <p className="font-figtree text-[13.5px] text-neutral-600 mb-4">
                  Para coordinar clases privadas o consultas, contacta directamente:
                </p>
                <a
                  href={`https://wa.me/${teacher.whatsapp.replace(/\s+/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackGenerateLead({ channel: 'whatsapp', teacherId: teacher.id, teacherName: teacher.name })}
                  className="inline-flex items-center gap-2 bg-whatsapp hover:bg-whatsapp-dark border border-neutral-900 text-white font-bold px-5 py-2.5 rounded-btn text-sm transition-colors active:scale-[0.97]"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
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

  const portfolioImages = Array.from(
    new Set(classes.flatMap(c => (c.gallery && c.gallery.length > 0 ? c.gallery : [c.coverImage])).filter(Boolean))
  ).slice(0, 4);

  const visibleStyles = teacher.styles.slice(0, 3);

  return (
    <div className="min-h-screen bg-neutral-900">
      <Header transparent />

      {/* Hero — foto full-bleed con la identidad anclada abajo */}
      <div className="relative h-[480px] md:h-[640px] overflow-hidden">
        {teacher.photo ? (
          <SmartImage
            src={teacher.photo}
            alt={teacher.name}
            fill
            priority
            sizes="100vw"
            className="object-cover brightness-[0.62] contrast-[1.08] saturate-[0.9]"
            style={{ objectPosition: teacher.photoPosition || '50% 20%', transform: `scale(${teacher.photoZoom || 1})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-neutral-900 flex items-center justify-center">
            <span className="text-[120px] font-black text-white/20">{teacher.name.charAt(0)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/25 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/85 via-neutral-900/35 to-neutral-900/15" />

        <div className="absolute left-5 md:left-14 top-[76px] md:top-24 z-10">
          <Link href="/clases" className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" /> Volver a clases
          </Link>
        </div>

        <div className="absolute left-5 right-5 md:left-14 md:right-14 bottom-6 md:bottom-11 flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
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
            <h1 className="text-[40px] md:text-[72px] leading-[0.95] font-black tracking-tight text-white">{teacher.name}</h1>
            <p className="font-figtree text-sm md:text-base text-white/75 mt-2 md:mt-3 flex items-center gap-2 flex-wrap">
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
          </div>

          <div className="flex flex-wrap gap-3">
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

      {/* Sobre mí — visible directo, sin heading ni tab */}
      <div className="px-5 md:px-14 pt-9 md:pt-11">
        <p className="font-figtree text-base md:text-lg leading-relaxed text-white/80 max-w-[760px]">
          {teacher.bio || 'Este profesor aún no agregó una biografía.'}
        </p>
      </div>

      {/* Ficha — ticker de datos reales */}
      <div className="font-figtree grid grid-cols-2 md:flex mt-8 border-y border-white/10 mx-5 md:mx-14 md:mt-9">
        {[
          { label: 'Especialidad', value: teacher.styles.join(' · ') || '—', border: 'border-r border-b md:border-b-0 md:border-r' },
          { label: 'Clases activas', value: `${classes.length} publicadas`, border: 'border-b md:border-b-0 md:border-r' },
          { label: 'Modalidad', value: modalityLabel + (cities.length === 1 ? ` · ${cities[0]}` : ''), border: 'border-r md:border-r' },
          { label: 'Desde', value: cheapestClass ? formatPrice(cheapestClass.priceType, cheapestClass.offerPrice ?? cheapestClass.price, cheapestClass.currency) : '—', border: '' },
        ].map(stat => (
          <div key={stat.label} className={`py-5 px-4 md:py-[22px] md:px-10 md:flex-1 border-white/10 ${stat.border}`}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">{stat.label}</p>
            <p className="text-[15px] md:text-[17px] font-bold text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Trabajos — solo si hay fotos reales que mostrar */}
      {portfolioImages.length > 0 && (
        <div className="px-5 md:px-14 pt-9 md:pt-11">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-2xl md:text-[28px] font-black tracking-tight text-white">Trabajos</h2>
            <span className="font-figtree text-[13px] md:text-[13.5px] text-neutral-400 hidden sm:block">
              Fotos y clases publicadas por {teacher.name}
            </span>
          </div>
          <div
            className={`grid gap-3 md:gap-3.5 mt-5 md:mt-6 ${
              portfolioImages.length === 1
                ? 'grid-cols-1'
                : portfolioImages.length === 2
                ? 'grid-cols-2'
                : 'grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr] md:grid-rows-2 md:h-[460px]'
            }`}
          >
            {portfolioImages.map((src, i) => (
              <div
                key={src}
                className={`relative rounded-2xl overflow-hidden bg-neutral-800 ${
                  portfolioImages.length >= 3
                    ? i === 0
                      ? 'row-span-2 aspect-[3/4] md:aspect-auto'
                      : 'aspect-[4/3] md:aspect-auto'
                    : 'aspect-[4/3]'
                }`}
              >
                <SmartImage src={src} alt="" fill sizes="(max-width: 768px) 50vw, 360px" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clases — visibles directo, sin tab */}
      <div className="px-5 md:px-14 pt-9 md:pt-11 pb-14 md:pb-16">
        <h2 className="text-xl md:text-2xl font-black text-white mb-5">Clases ({classes.length})</h2>
        {classes.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <p className="text-4xl mb-3">🕺</p>
            <p className="text-sm">Este profesor no tiene clases publicadas actualmente.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {classes.map(cls => <ClassCard key={cls.id} cls={cls} listName="profesor_detail" />)}
          </div>
        )}
      </div>
    </div>
  );
}
