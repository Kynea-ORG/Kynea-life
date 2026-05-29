'use client';
import { useState } from 'react';
import Link from 'next/link';
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

      <div className="max-w-5xl mx-auto px-5 lg:px-8 py-8">
        <Link href="/clases" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Volver a clases
        </Link>

        {/* Profile header */}
        <div className="flex flex-col sm:flex-row items-start gap-6 mb-8 p-6 bg-neutral-50 rounded-xl border border-neutral-200">
          {teacher.photo ? (
            <img
              src={teacher.photo}
              alt={teacher.name}
              className="w-24 h-24 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-neutral-200 flex items-center justify-center text-3xl font-black text-neutral-500 shrink-0">
              {teacher.name.charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-neutral-900">{teacher.name}</h1>
                <p className="text-sm text-neutral-500 mt-0.5 capitalize">{teacher.type} de danza</p>
              </div>
              {teacher.rating && (
                <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-100 px-3 py-1.5 rounded-full">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-bold text-neutral-800 text-sm">{teacher.rating}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mt-3 text-sm text-neutral-500">
              {(teacher.district || teacher.city) && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                  {[teacher.district, teacher.city].filter(Boolean).join(', ')}
                </span>
              )}
              {teacher.experience > 0 && (
                <>
                  <span className="text-neutral-300">·</span>
                  <span>{teacher.experience} años de experiencia</span>
                </>
              )}
              {teacher.totalClasses && (
                <>
                  <span className="text-neutral-300">·</span>
                  <span>{teacher.totalClasses} clases publicadas</span>
                </>
              )}
            </div>

            {teacher.styles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {teacher.styles.map(s => (
                  <span key={s} className="text-xs font-semibold bg-pink-50 text-pink-600 border border-pink-100 px-2.5 py-1 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-3 mt-3">
              {teacher.instagram && (
                <span className="text-xs text-neutral-500 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5" /> {teacher.instagram}
                </span>
              )}
              {teacher.tiktok && (
                <span className="text-xs text-neutral-500 flex items-center gap-1">
                  <Video className="w-3.5 h-3.5" /> {teacher.tiktok}
                </span>
              )}
              {teacher.website && (
                <a href={teacher.website} target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-900 flex items-center gap-1 hover:underline font-medium">
                  <Globe className="w-3.5 h-3.5" /> Sitio web
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-neutral-100 rounded-xl p-1 w-fit">
          {[
            { key: 'clases' as const, label: `Clases (${classes.length})` },
            { key: 'bio' as const, label: 'Sobre mí' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
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
              <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-5">
                <h3 className="font-bold text-neutral-900 mb-3">Contacto</h3>
                <p className="text-sm text-neutral-600 mb-4">
                  Para coordinar clases privadas o consultas, contacta directamente:
                </p>
                <a
                  href={`https://wa.me/${teacher.whatsapp.replace(/\s+/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BC5A] text-white font-bold px-5 py-2.5 rounded-btn text-sm transition-colors"
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
