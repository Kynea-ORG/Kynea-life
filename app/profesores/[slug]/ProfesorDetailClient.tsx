'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Star, MapPin, Camera, Video, Globe, MessageCircle } from 'lucide-react';
import Header from '@/components/Header';
import ClassCard from '@/components/ClassCard';
import type { Teacher, DanceClass } from '@/lib/types';

export default function ProfesorDetailClient({
  teacher,
  classes,
}: {
  teacher: Teacher;
  classes: DanceClass[];
}) {
  const [activeTab, setActiveTab] = useState<'clases' | 'bio'>('clases');

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Artistic profile banner */}
      <div className="relative bg-primary overflow-hidden pt-10 px-5 lg:px-8 pb-[88px]">
        <div className="relative z-10 max-w-5xl mx-auto">
          <Link href="/clases" className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Volver a clases
          </Link>

          <div className="flex flex-wrap items-start gap-6">
            <div className="relative w-40 h-40 rounded-full overflow-hidden shrink-0 bg-neutral-900 flex items-center justify-center">
              {teacher.photo ? (
                <Image src={teacher.photo} alt={teacher.name} fill sizes="160px" className="object-cover" style={{ objectPosition: teacher.photoPosition || '50% 50%', transform: `scale(${teacher.photoZoom || 1})` }} />
              ) : (
                <span className="text-[56px] font-black text-white">{teacher.name.charAt(0)}</span>
              )}
            </div>

            <div className="flex-1 min-w-[260px] pt-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-[30px] font-black text-white tracking-tight">{teacher.name}</h1>
                  <p className="font-figtree text-[14px] text-white/75 mt-1 capitalize">{teacher.type} de danza</p>
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
                    <span>{teacher.experience} años de experiencia</span>
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

              <div className="flex flex-wrap gap-4 mt-3.5">
                {teacher.instagram && (
                  <span className="text-[12.5px] text-white/80 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" /> {teacher.instagram}
                  </span>
                )}
                {teacher.tiktok && (
                  <span className="text-[12.5px] text-white/80 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" /> {teacher.tiktok}
                  </span>
                )}
                {teacher.website && (
                  <a href={teacher.website} target="_blank" rel="noopener noreferrer" className="text-[12.5px] text-white flex items-center gap-1.5 hover:underline font-bold">
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
            { key: 'bio' as const, label: 'Sobre mí' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-[background-color,color,box-shadow] active:scale-[0.97] ${
                activeTab === tab.key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
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
              <p className="text-sm">Este profesor no tiene clases publicadas actualmente.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {classes.map(cls => <ClassCard key={cls.id} cls={cls} />)}
            </div>
          )
        ) : (
          <div className="max-w-2xl">
            <p className="text-neutral-600 leading-relaxed mb-6">{teacher.bio || 'Sin biografía aún.'}</p>
            {teacher.whatsapp && (
              <div className="bg-neutral-50 rounded-2xl border border-neutral-900 p-6">
                <h3 className="font-extrabold text-neutral-900 mb-2.5">Contacto</h3>
                <p className="font-figtree text-[13.5px] text-neutral-500 mb-4">
                  Para coordinar clases privadas o consultas, contacta directamente:
                </p>
                <a
                  href={`https://wa.me/${teacher.whatsapp.replace(/\s+/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BC5A] border border-neutral-900 text-white font-bold px-5 py-2.5 rounded-btn text-sm transition-colors active:scale-[0.97]"
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
