'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import SmartImage from '@/components/SmartImage';
import { ChevronLeft, Star, MapPin, Globe, MessageCircle, Users, Building2 } from 'lucide-react';
import { InstagramIcon, TikTokIcon } from '@/components/icons/SocialIcons';
import Header from '@/components/Header';
import ClassCard from '@/components/ClassCard';
import { trackGenerateLead, trackViewProfile, trackTeacherSocialClick } from '@/lib/analytics';
import { buildInstagramUrl, buildTikTokUrl, formatExperience, DEFAULT_ACADEMIA_COVER } from '@/lib/utils';
import type { Teacher, DanceClass } from '@/lib/types';
import LinkifiedText from '@/components/LinkifiedText';

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

  return (
    <div className="min-h-screen bg-white overflow-x-clip">
      <Header />

      {/* Artistic profile banner — academia gets a real cover photo behind a
          dark overlay for legibility; profesor keeps the plain bg-primary
          banner untouched (academia and profesor are deliberately not the
          same visual treatment here). */}
      <div className={`relative overflow-hidden pt-10 px-5 lg:px-8 pb-[88px] ${teacher.type === 'academia' ? 'bg-neutral-900' : 'bg-primary'}`}>
        {teacher.type === 'academia' && (
          <>
            <SmartImage
              src={teacher.coverImage || DEFAULT_ACADEMIA_COVER}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
              style={{ objectPosition: teacher.coverImagePosition || '50% 50%', transform: `scale(${teacher.coverImageZoom || 1})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/45 to-black/75" />
          </>
        )}
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

            <div className="flex-1 min-w-0 sm:min-w-[260px] pt-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-[30px] font-black text-white tracking-tight break-words">{teacher.name}</h1>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${
                      teacher.type === 'academia' ? 'bg-pink-50 text-pink-600' : 'bg-white text-neutral-700'
                    }`}>
                      {teacher.type === 'academia' ? 'Academia' : 'Profesor'}
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

              {teacher.type === 'academia' && teacher.venueAddress && (
                <p className="flex items-center gap-1.5 text-[13px] text-white/75 mt-3.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {[teacher.venueAddress, teacher.venueDistrict, teacher.venueCity].filter(Boolean).join(', ')}
                </p>
              )}

              {teacher.type === 'academia' && (teacher.teamSize || teacher.branchCount) && (
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
            { key: 'bio' as const, label: teacher.type === 'academia' ? 'Sobre la academia' : 'Sobre mí' },
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
              <p className="text-sm">
                {teacher.type === 'academia' ? 'Esta academia no tiene clases publicadas actualmente.' : 'Este profesor no tiene clases publicadas actualmente.'}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {classes.map(cls => <ClassCard key={cls.id} cls={cls} listName="profesor_detail" />)}
            </div>
          )
        ) : (
          <div className="max-w-2xl min-w-0">
            <p className="text-neutral-600 leading-relaxed mb-6 whitespace-pre-line break-words [overflow-wrap:anywhere]"><LinkifiedText text={teacher.bio || 'Sin biografía aún.'} /></p>
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
