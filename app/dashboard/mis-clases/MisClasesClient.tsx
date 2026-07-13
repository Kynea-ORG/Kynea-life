'use client';
import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { PlusCircle, Edit2, Copy, Eye, EyeOff, ExternalLink, Trash2, MoreHorizontal } from 'lucide-react';
import { getStatusColor, getStatusLabel, getTypeLabel, formatPrice, formatTimeSlots } from '@/lib/utils';
import { updateClass, deleteClass as deleteClassAction, duplicateClass as duplicateClassAction } from '@/lib/classes/actions';
import { parsePublishError, profileFixHref } from '@/lib/classes/validation';
import type { ClassStatus, DanceClass } from '@/lib/types';

const STATUS_TABS: { key: ClassStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'published', label: 'Publicadas' },
  { key: 'draft', label: 'Borradores' },
  { key: 'finished', label: 'Finalizadas' },
  { key: 'archived', label: 'Archivadas' },
];

export default function MisClasesClient({ initialClasses }: { initialClasses: DanceClass[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [classes, setClasses] = useState<DanceClass[]>(initialClasses);
  const [activeTab, setActiveTab] = useState<ClassStatus | 'all'>('all');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  // Publish success signal survives the server redirect via ?published=1
  // (set by createClass/updateClassFromForm) — read once via a lazy
  // initializer so the initial toast doesn't require a setState-in-effect.
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'error'; href?: string; actionLabel?: string } | null>(() =>
    searchParams.get('published') === '1'
      ? { msg: 'Tu clase fue publicada correctamente.', type: 'success' }
      : null
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Clear the ?published=1 param so a refresh doesn't re-show the toast.
  useEffect(() => {
    if (searchParams.get('published') === '1') {
      router.replace('/dashboard/mis-clases');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'success', href?: string, actionLabel?: string) => {
    setToast({ msg, type, href, actionLabel });
  };

  const publishClass = (id: string) => {
    const previousStatus = classes.find(c => c.id === id)?.status ?? 'draft';
    setClasses(prev => prev.map(c => c.id === id ? { ...c, status: 'published' as const } : c));
    showToast('Clase publicada', 'success');
    startTransition(async () => {
      try {
        await updateClass(id, { status: 'published' });
      } catch (err) {
        setClasses(prev => prev.map(c => c.id === id ? { ...c, status: previousStatus } : c));
        const payload = parsePublishError(err);
        if (payload?.code === 'MISSING_CONTACT_CHANNEL') {
          showToast(payload.message, 'error', profileFixHref(payload.missing ?? []), 'Completar perfil');
        } else if (payload?.code === 'VALIDATION') {
          showToast(payload.message, 'error', `/dashboard/crear-clase?edit=${id}`, 'Completar clase');
        } else {
          showToast('Error al publicar', 'error');
        }
      }
    });
  };

  const hideClass = (id: string) => {
    setClasses(prev => prev.map(c => c.id === id ? { ...c, status: 'archived' as const } : c));
    showToast('Clase ocultada', 'info');
    startTransition(async () => {
      try {
        await updateClass(id, { status: 'archived' });
      } catch {
        setClasses(prev => prev.map(c => c.id === id ? { ...c, status: 'published' as const } : c));
        showToast('Error al ocultar', 'error');
      }
    });
  };

  const handleDelete = (id: string) => {
    setClasses(prev => prev.filter(c => c.id !== id));
    setConfirmDelete(null);
    setOpenMenu(null);
    showToast('Clase eliminada', 'error');
    startTransition(async () => {
      try {
        await deleteClassAction(id);
      } catch {
        showToast('Error al eliminar (recarga la página)', 'error');
        router.refresh();
      }
    });
  };

  const handleDuplicate = (id: string) => {
    showToast('Duplicando…', 'info');
    startTransition(async () => {
      try {
        await duplicateClassAction(id);
        router.refresh();
        showToast('Clase duplicada', 'success');
      } catch {
        showToast('Error al duplicar', 'error');
      }
    });
  };

  const filtered = activeTab === 'all' ? classes : classes.filter(c => c.status === activeTab);

  return (
    <div className="p-6 lg:p-8">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold transition-all duration-300 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-neutral-900 text-white'
        }`}>
          <span>{toast.msg}</span>
          {toast.href && (
            <Link href={toast.href} className="underline font-bold shrink-0">
              {toast.actionLabel ?? 'Ver'}
            </Link>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-neutral-900">Mis clases</h1>
          <p className="text-neutral-500 text-sm mt-1">{classes.length} clases en total</p>
        </div>
        <Link href="/dashboard/crear-clase" className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-btn transition-colors">
          <PlusCircle className="w-4 h-4" /> Nueva clase
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-neutral-100 rounded-xl p-1 overflow-x-auto">
        {STATUS_TABS.map(tab => {
          const count = tab.key === 'all' ? classes.length : classes.filter(c => c.status === tab.key).length;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}>
              {tab.label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-500'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-bold text-neutral-900 mb-2">Sin clases en esta categoría</h3>
          <p className="text-neutral-500 text-sm mb-6">Aún no tienes clases aquí.</p>
          <Link href="/dashboard/crear-clase" className="btn-outline text-sm">Crear clase</Link>
        </div>
      )}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100 text-left">
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Clase</th>
                <th className="px-4 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Tipo</th>
                <th className="px-4 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Horario</th>
                <th className="px-4 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Cupos</th>
                <th className="px-4 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Precio</th>
                <th className="px-4 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filtered.map(cls => (
                <tr key={cls.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {cls.coverImage ? (
                        <div className="relative w-12 h-10 rounded-lg overflow-hidden shrink-0">
                          <Image src={cls.coverImage} alt={cls.title} fill sizes="48px" className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-10 rounded-lg bg-neutral-100 shrink-0" />
                      )}
                      <div>
                        <p className="font-semibold text-neutral-900 text-sm">{cls.title}</p>
                        <p className="text-xs text-neutral-500">{cls.style} · {cls.level}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs text-neutral-600 bg-neutral-100 px-2 py-1 rounded-full">{getTypeLabel(cls.type)}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(cls.status)}`}>
                      {getStatusLabel(cls.status)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-neutral-600 max-w-32">
                    <span className="truncate block">{formatTimeSlots(cls.timeSlots).split(' | ')[0]}</span>
                  </td>
                  <td className="px-4 py-4 text-xs text-neutral-600">
                    {cls.availableSpots ?? '—'}/{cls.maxSpots ?? '—'}
                  </td>
                  <td className="px-4 py-4 text-xs font-semibold text-neutral-900">
                    {formatPrice(cls.priceType, cls.price, cls.currency)}
                  </td>
                  <td className="px-4 py-4">
                    {confirmDelete === cls.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-600 whitespace-nowrap">¿Eliminar?</span>
                        <button onClick={() => handleDelete(cls.id)} className="text-xs font-semibold text-red-600 hover:text-red-700 whitespace-nowrap">
                          Sí, eliminar
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="text-xs font-semibold text-neutral-500 hover:text-neutral-700 whitespace-nowrap">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {cls.status === 'draft' && (
                          <button onClick={() => publishClass(cls.id)} disabled={isPending}
                            className="text-xs px-3 py-1.5 rounded-btn bg-neutral-900 text-white font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50">
                            Publicar
                          </button>
                        )}
                        {cls.status === 'published' && (
                          <button onClick={() => hideClass(cls.id)} disabled={isPending}
                            className="text-xs px-3 py-1.5 rounded-btn border-2 border-neutral-200 text-neutral-600 font-semibold hover:bg-neutral-50 transition-colors disabled:opacity-50">
                            Ocultar
                          </button>
                        )}
                        {cls.status === 'archived' && (
                          <button onClick={() => publishClass(cls.id)} disabled={isPending}
                            className="text-xs px-3 py-1.5 rounded-btn bg-neutral-900 text-white font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50">
                            Activar
                          </button>
                        )}
                        <Link href={`/dashboard/crear-clase?edit=${cls.id}`} title="Editar"
                          className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-700 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button title="Duplicar" onClick={() => handleDuplicate(cls.id)} disabled={isPending}
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-neutral-400 hover:text-blue-600 transition-colors disabled:opacity-50">
                          <Copy className="w-4 h-4" />
                        </button>
                        {cls.status === 'published' && (
                          <Link href={`/clases/${cls.id}`} title="Ver publicación" target="_blank"
                            className="p-1.5 hover:bg-green-50 rounded-lg text-neutral-400 hover:text-green-600 transition-colors">
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )}
                        <button title="Eliminar" onClick={() => setConfirmDelete(cls.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-neutral-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map(cls => (
          <div key={cls.id} className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              {cls.coverImage ? (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                  <Image src={cls.coverImage} alt={cls.title} fill sizes="64px" className="object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-neutral-100 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-neutral-900 text-sm">{cls.title}</p>
                    <p className="text-xs text-neutral-500">{cls.style} · {cls.level}</p>
                  </div>
                  <button onClick={() => setOpenMenu(openMenu === cls.id ? null : cls.id)} className="p-1 text-neutral-400">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(cls.status)}`}>
                    {getStatusLabel(cls.status)}
                  </span>
                  <span className="text-xs text-neutral-900 font-semibold">{formatPrice(cls.priceType, cls.price, cls.currency)}</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">{formatTimeSlots(cls.timeSlots).split(' | ')[0]}</p>
              </div>
            </div>

            {openMenu === cls.id && (
              <div className="mt-3 pt-3 border-t border-neutral-100 space-y-2">
                <div className="flex gap-2">
                  {cls.status === 'draft' && (
                    <button onClick={() => { publishClass(cls.id); setOpenMenu(null); }} disabled={isPending}
                      className="text-xs font-bold text-white flex items-center gap-1 bg-neutral-900 px-3 py-1.5 rounded-btn hover:bg-neutral-800 transition-colors disabled:opacity-50">
                      <Eye className="w-3 h-3" /> Publicar
                    </button>
                  )}
                  {cls.status === 'published' && (
                    <button onClick={() => { hideClass(cls.id); setOpenMenu(null); }} disabled={isPending}
                      className="text-xs font-semibold text-neutral-600 flex items-center gap-1 border-2 border-neutral-200 px-3 py-1.5 rounded-btn hover:bg-neutral-50 transition-colors disabled:opacity-50">
                      <EyeOff className="w-3 h-3" /> Ocultar
                    </button>
                  )}
                  {cls.status === 'archived' && (
                    <button onClick={() => { publishClass(cls.id); setOpenMenu(null); }} disabled={isPending}
                      className="text-xs font-bold text-white flex items-center gap-1 bg-neutral-900 px-3 py-1.5 rounded-btn hover:bg-neutral-800 transition-colors disabled:opacity-50">
                      <Eye className="w-3 h-3" /> Activar
                    </button>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Link href={`/dashboard/crear-clase?edit=${cls.id}`}
                    className="text-xs font-medium text-neutral-900 flex items-center gap-1 bg-neutral-100 px-3 py-1.5 rounded-lg">
                    <Edit2 className="w-3 h-3" /> Editar
                  </Link>
                  <button onClick={() => { handleDuplicate(cls.id); setOpenMenu(null); }} disabled={isPending}
                    className="text-xs font-medium text-blue-600 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg disabled:opacity-50">
                    <Copy className="w-3 h-3" /> Duplicar
                  </button>
                  {cls.status === 'published' && (
                    <Link href={`/clases/${cls.id}`} target="_blank"
                      className="text-xs font-medium text-green-700 flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-lg">
                      <ExternalLink className="w-3 h-3" /> Ver
                    </Link>
                  )}
                  {confirmDelete === cls.id ? (
                    <div className="flex items-center gap-2 w-full mt-1">
                      <span className="text-xs text-neutral-600">¿Eliminar esta clase?</span>
                      <button onClick={() => handleDelete(cls.id)} className="text-xs font-semibold text-red-600">Sí</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs font-semibold text-neutral-500">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(cls.id)}
                      className="text-xs font-medium text-red-600 flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-lg">
                      <Trash2 className="w-3 h-3" /> Eliminar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
