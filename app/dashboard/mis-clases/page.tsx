'use client';
import { useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Edit2, Copy, Eye, EyeOff, ExternalLink, Trash2, MoreHorizontal } from 'lucide-react';
import { mockClasses, getStatusColor, getStatusLabel, getTypeLabel, formatPrice, formatTimeSlots } from '@/lib/mockData';
import { ClassStatus } from '@/lib/types';

const STATUS_TABS: { key: ClassStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'published', label: 'Publicadas' },
  { key: 'draft', label: 'Borradores' },
  { key: 'finished', label: 'Finalizadas' },
  { key: 'archived', label: 'Archivadas' },
];

export default function MisClasesPage() {
  const [activeTab, setActiveTab] = useState<ClassStatus | 'all'>('all');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const filtered = activeTab === 'all' ? mockClasses : mockClasses.filter(c => c.status === activeTab);

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Mis clases</h1>
          <p className="text-gray-500 text-sm mt-1">{mockClasses.length} clases en total</p>
        </div>
        <Link
          href="/dashboard/crear-clase"
          className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-full transition-colors"
        >
          <PlusCircle className="w-4 h-4" /> Nueva clase
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {STATUS_TABS.map(tab => {
          const count = tab.key === 'all' ? mockClasses.length : mockClasses.filter(c => c.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Sin clases en esta categoría</h3>
          <p className="text-gray-500 text-sm mb-6">Aún no tienes clases aquí.</p>
          <Link href="/dashboard/crear-clase" className="text-purple-600 font-medium border border-purple-200 px-6 py-2 rounded-xl hover:bg-purple-50 text-sm">
            Crear clase
          </Link>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Clase</th>
              <th className="px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
              <th className="px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              <th className="px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Horario</th>
              <th className="px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cupos</th>
              <th className="px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Precio</th>
              <th className="px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(cls => (
              <tr key={cls.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={cls.coverImage} alt={cls.title} className="w-12 h-10 rounded-lg object-cover shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{cls.title}</p>
                      <p className="text-xs text-gray-500">{cls.style} · {cls.level}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">{getTypeLabel(cls.type)}</span>
                </td>
                <td className="px-4 py-4">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(cls.status)}`}>
                    {getStatusLabel(cls.status)}
                  </span>
                </td>
                <td className="px-4 py-4 text-xs text-gray-600 max-w-32">
                  <span className="truncate block">{formatTimeSlots(cls.timeSlots).split(' | ')[0]}</span>
                </td>
                <td className="px-4 py-4 text-xs text-gray-600">
                  {cls.availableSpots}/{cls.maxSpots}
                </td>
                <td className="px-4 py-4 text-xs font-semibold text-purple-700">
                  {formatPrice(cls.priceType, cls.price, cls.currency)}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1">
                    <Link href={`/dashboard/crear-clase?edit=${cls.id}`} title="Editar" className="p-1.5 hover:bg-purple-50 rounded-lg text-gray-400 hover:text-purple-600 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </Link>
                    <button title="Duplicar" className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button title={cls.status === 'published' ? 'Archivar' : 'Publicar'} className="p-1.5 hover:bg-yellow-50 rounded-lg text-gray-400 hover:text-yellow-600 transition-colors">
                      {cls.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <Link href={`/clases/${cls.id}`} title="Ver publicación" target="_blank" className="p-1.5 hover:bg-green-50 rounded-lg text-gray-400 hover:text-green-600 transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <button title="Eliminar" className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map(cls => (
          <div key={cls.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <img src={cls.coverImage} alt={cls.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{cls.title}</p>
                    <p className="text-xs text-gray-500">{cls.style} · {cls.level}</p>
                  </div>
                  <button
                    onClick={() => setOpenMenu(openMenu === cls.id ? null : cls.id)}
                    className="p-1 text-gray-400"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(cls.status)}`}>
                    {getStatusLabel(cls.status)}
                  </span>
                  <span className="text-xs text-purple-700 font-semibold">{formatPrice(cls.priceType, cls.price, cls.currency)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{formatTimeSlots(cls.timeSlots).split(' | ')[0]}</p>
              </div>
            </div>
            {openMenu === cls.id && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 flex-wrap">
                <Link href={`/dashboard/crear-clase?edit=${cls.id}`} className="text-xs font-medium text-purple-600 flex items-center gap-1 bg-purple-50 px-3 py-1.5 rounded-lg">
                  <Edit2 className="w-3 h-3" /> Editar
                </Link>
                <button className="text-xs font-medium text-blue-600 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg">
                  <Copy className="w-3 h-3" /> Duplicar
                </button>
                <button className="text-xs font-medium text-gray-600 flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-lg">
                  <EyeOff className="w-3 h-3" /> Pausar
                </button>
                <button className="text-xs font-medium text-red-600 flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-lg">
                  <Trash2 className="w-3 h-3" /> Eliminar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
