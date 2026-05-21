'use client';
import Link from 'next/link';
import { PlusCircle, Upload, BookOpen, TrendingUp, Clock, Eye, MessageCircle, ChevronRight, ArrowUpRight } from 'lucide-react';
import { mockClasses, getStatusColor, getStatusLabel, formatPrice, formatTimeSlots, getConversionRate } from '@/lib/mockData';

const publishedClasses = mockClasses.filter(c => c.status === 'published');
const draftClasses = mockClasses.filter(c => c.status === 'draft');
const totalViews = publishedClasses.reduce((acc, c) => acc + c.metrics.views, 0);
const totalContacts = publishedClasses.reduce((acc, c) => acc + c.metrics.contacts, 0);

const METRICS = [
  { label: 'Visualizaciones', value: totalViews,                         icon: Eye,           bg: 'bg-blue-pastel-bg', text: 'text-blue-700',  iconBg: 'bg-blue-pastel/30' },
  { label: 'Inscripciones',   value: totalContacts,                      icon: MessageCircle, bg: 'bg-pink-50',        text: 'text-pink-600', iconBg: 'bg-pink-100' },
  { label: 'Tasa conv.',      value: getConversionRate(totalViews, totalContacts), icon: TrendingUp,    bg: 'bg-green-bg',       text: 'text-green-text', iconBg: 'bg-green-bg' },
  { label: 'Publicadas',      value: publishedClasses.length,            icon: BookOpen,      bg: 'bg-neutral-50',     text: 'text-neutral-700', iconBg: 'bg-neutral-200' },
];

export default function DashboardPage() {
  const recentClasses = publishedClasses.slice(0, 3);

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[24px] font-black text-neutral-900 tracking-snug">Hola, Academia Ritmo Latino 👋</h1>
          <p className="text-neutral-500 text-[15px] mt-1">Aquí tienes el resumen de tu actividad</p>
        </div>
        <div className="hidden sm:flex gap-3">
          <Link href="/dashboard/importar-csv" className="btn-outline btn-sm flex items-center gap-2">
            <Upload className="w-4 h-4" /> Importar CSV
          </Link>
          <Link href="/dashboard/crear-clase" className="btn-dark btn-sm flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> Crear clase
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {METRICS.map(m => {
          const Icon = m.icon;
          return (
            <div key={m.label} className={`${m.bg} rounded-xl p-5 border border-neutral-200`}>
              <div className={`w-9 h-9 ${m.iconBg} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${m.text}`} />
              </div>
              <p className={`text-[24px] font-black ${m.text}`}>{m.value}</p>
              <p className="text-[13px] font-medium text-neutral-500 mt-0.5">{m.label}</p>
            </div>
          );
        })}
      </div>

      {/* Draft alert */}
      {draftClasses.length > 0 && (
        <div className="flex items-center justify-between bg-yellow-bg border border-yellow-dark/30 rounded-xl px-5 py-4 mb-6">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-neutral-700" />
            <p className="text-[15px] font-semibold text-neutral-800">
              Tienes {draftClasses.length} borrador{draftClasses.length !== 1 ? 'es' : ''} sin publicar
            </p>
          </div>
          <Link href="/dashboard/mis-clases" className="text-[13px] font-bold text-neutral-900 hover:underline">Ver borradores</Link>
        </div>
      )}

      {/* Recent published classes */}
      <div className="bg-white rounded-xl border border-neutral-200 mb-6">
        <div className="flex items-center justify-between p-6 border-b border-neutral-100">
          <h2 className="font-bold text-neutral-900 text-[17px]">Clases publicadas</h2>
          <Link href="/dashboard/mis-clases" className="text-[13px] text-neutral-600 font-medium flex items-center gap-1 hover:text-neutral-900">
            Ver todas <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-neutral-50">
          {recentClasses.map(cls => (
            <div key={cls.id} className="flex items-center gap-4 p-4 hover:bg-neutral-50 transition-colors">
              <img src={cls.coverImage} alt={cls.title} className="w-14 h-14 rounded-lg object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-neutral-900 text-[15px] truncate">{cls.title}</p>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${getStatusColor(cls.status)}`}>
                    {getStatusLabel(cls.status)}
                  </span>
                </div>
                <p className="text-[13px] text-neutral-500 mt-0.5">{formatTimeSlots(cls.timeSlots)}</p>
                <div className="flex items-center gap-4 mt-1.5">
                  <span className="text-[13px] text-neutral-500 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {cls.metrics.views} vistas
                  </span>
                  <span className="text-[13px] text-neutral-500 flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" /> {cls.metrics.contacts} contactos
                  </span>
                  <span className="text-[13px] font-semibold text-neutral-900">{formatPrice(cls.priceType, cls.price, cls.currency)}</span>
                </div>
              </div>
              <Link
                href={`/clases/${cls.id}`}
                className="text-[13px] text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors shrink-0"
              >
                Ver <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/dashboard/crear-clase"
          className="flex items-center gap-4 p-5 bg-neutral-900 rounded-xl text-white hover:bg-neutral-800 transition-colors"
        >
          <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-[15px]">Crear nueva clase</p>
            <p className="text-[13px] text-neutral-400">Publica en minutos</p>
          </div>
          <ChevronRight className="w-5 h-5 ml-auto text-neutral-400" />
        </Link>
        <Link
          href="/dashboard/importar-csv"
          className="flex items-center gap-4 p-5 bg-white border-2 border-neutral-200 rounded-xl text-neutral-900 hover:border-neutral-900 transition-colors"
        >
          <div className="w-12 h-12 bg-neutral-50 rounded-lg flex items-center justify-center">
            <Upload className="w-6 h-6 text-neutral-600" />
          </div>
          <div>
            <p className="font-bold text-[15px]">Importar CSV</p>
            <p className="text-[13px] text-neutral-500">Sube varias clases a la vez</p>
          </div>
          <ChevronRight className="w-5 h-5 ml-auto text-neutral-400" />
        </Link>
      </div>
    </div>
  );
}
