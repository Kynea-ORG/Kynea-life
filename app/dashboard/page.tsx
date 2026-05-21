'use client';
import Link from 'next/link';
import { PlusCircle, Upload, BookOpen, TrendingUp, Clock, Eye, MessageCircle, ChevronRight, ArrowUpRight } from 'lucide-react';
import { mockClasses, getStatusColor, getStatusLabel, formatPrice, formatTimeSlots, getConversionRate } from '@/lib/mockData';

const publishedClasses = mockClasses.filter(c => c.status === 'published');
const draftClasses = mockClasses.filter(c => c.status === 'draft');
const totalViews = publishedClasses.reduce((acc, c) => acc + c.metrics.views, 0);
const totalContacts = publishedClasses.reduce((acc, c) => acc + c.metrics.contacts, 0);

const METRICS = [
  { label: 'Visualizaciones', value: totalViews, icon: Eye, color: 'bg-blue-50 text-blue-600', iconBg: 'bg-blue-100' },
  { label: 'Inscripciones', value: totalContacts, icon: MessageCircle, color: 'bg-purple-50 text-purple-600', iconBg: 'bg-purple-100' },
  { label: 'Tasa de conversión', value: getConversionRate(totalViews, totalContacts), icon: TrendingUp, color: 'bg-green-50 text-green-600', iconBg: 'bg-green-100' },
  { label: 'Clases publicadas', value: publishedClasses.length, icon: BookOpen, color: 'bg-yellow-50 text-yellow-700', iconBg: 'bg-yellow-100' },
];

export default function DashboardPage() {
  const recentClasses = publishedClasses.slice(0, 3);

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Hola, Academia Ritmo Latino 👋</h1>
          <p className="text-gray-500 text-sm mt-1">Aquí tienes el resumen de tu actividad</p>
        </div>
        <div className="hidden sm:flex gap-3">
          <Link
            href="/dashboard/importar-csv"
            className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 border border-gray-200 rounded-full text-gray-600 hover:border-purple-300 transition-colors"
          >
            <Upload className="w-4 h-4" /> Importar CSV
          </Link>
          <Link
            href="/dashboard/crear-clase"
            className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-full transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> Crear clase
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {METRICS.map(m => {
          const Icon = m.icon;
          return (
            <div key={m.label} className={`${m.color} rounded-2xl p-5 border border-current/10`}>
              <div className={`w-10 h-10 ${m.iconBg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black">{m.value}</p>
              <p className="text-xs font-medium mt-0.5 opacity-70">{m.label}</p>
            </div>
          );
        })}
      </div>

      {/* Borradores alert */}
      {draftClasses.length > 0 && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">
              Tienes {draftClasses.length} borrador{draftClasses.length !== 1 ? 'es' : ''} sin publicar
            </p>
          </div>
          <Link href="/dashboard/mis-clases" className="text-xs font-bold text-amber-700 hover:underline">Ver borradores</Link>
        </div>
      )}

      {/* Recent published classes */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Clases publicadas</h2>
          <Link href="/dashboard/mis-clases" className="text-xs text-purple-600 font-medium flex items-center gap-1">
            Ver todas <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentClasses.map(cls => (
            <div key={cls.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
              <img src={cls.coverImage} alt={cls.title} className="w-14 h-14 rounded-xl object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 text-sm truncate">{cls.title}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${getStatusColor(cls.status)}`}>
                    {getStatusLabel(cls.status)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{formatTimeSlots(cls.timeSlots)}</p>
                <div className="flex items-center gap-4 mt-1.5">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {cls.metrics.views} vistas
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" /> {cls.metrics.contacts} contactos
                  </span>
                  <span className="text-xs font-semibold text-purple-700">{formatPrice(cls.priceType, cls.price, cls.currency)}</span>
                </div>
              </div>
              <Link
                href={`/clases/${cls.id}`}
                className="text-xs text-gray-500 hover:text-purple-600 flex items-center gap-1 transition-colors shrink-0"
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
          className="flex items-center gap-4 p-5 bg-gradient-to-br from-purple-600 to-violet-700 rounded-2xl text-white hover:opacity-95 transition-opacity"
        >
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold">Crear nueva clase</p>
            <p className="text-xs text-white/70">Publica en minutos</p>
          </div>
          <ChevronRight className="w-5 h-5 ml-auto" />
        </Link>
        <Link
          href="/dashboard/importar-csv"
          className="flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-2xl text-gray-900 hover:border-purple-300 transition-colors"
        >
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
            <Upload className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="font-bold">Importar CSV</p>
            <p className="text-xs text-gray-500">Sube varias clases a la vez</p>
          </div>
          <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
        </Link>
      </div>
    </div>
  );
}
