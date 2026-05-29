import { createClient } from '@/lib/supabase/server';
import { fetchTeacherClasses } from '@/lib/queries/classes';
import { MessageCircle, Eye, Bookmark, TrendingUp } from 'lucide-react';

export default async function ContactosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const allClasses = await fetchTeacherClasses(user.id);
  const published = allClasses.filter(c => c.status === 'published');

  const totalContacts = published.reduce((s, c) => s + (c.metrics?.contacts ?? 0), 0);
  const totalViews    = published.reduce((s, c) => s + (c.metrics?.views    ?? 0), 0);
  const totalSaved    = published.reduce((s, c) => s + (c.metrics?.saved    ?? 0), 0);

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-neutral-900">Contactos e interacciones</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Métricas reales de tus {published.length} clase{published.length !== 1 ? 's' : ''} publicadas
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Contactos totales', value: totalContacts, icon: MessageCircle, color: 'text-green-text', bg: 'bg-green-bg' },
          { label: 'Vistas totales',    value: totalViews,    icon: Eye,           color: 'text-blue-700',  bg: 'bg-blue-pastel-bg' },
          { label: 'Guardados',         value: totalSaved,    icon: Bookmark,      color: 'text-neutral-700', bg: 'bg-neutral-50' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`${stat.bg} rounded-xl p-5 border border-neutral-200`}>
              <Icon className={`w-5 h-5 ${stat.color} mb-3`} />
              <p className={`text-[28px] font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-[13px] font-medium text-neutral-500 mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Classes table */}
      {published.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-neutral-200">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
          <p className="font-semibold text-neutral-500">Aún no tienes clases publicadas</p>
          <p className="text-sm text-neutral-400 mt-1">Publica tu primera clase para ver las métricas aquí</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
          <div className="divide-y divide-neutral-100">
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 bg-neutral-50 text-[12px] font-semibold text-neutral-500 uppercase tracking-wide">
              <span>Clase</span>
              <span className="w-20 text-center">Contactos</span>
              <span className="w-16 text-center">Vistas</span>
              <span className="w-20 text-center">Guardados</span>
            </div>

            {published.map(cls => (
              <div key={cls.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-4 items-center hover:bg-neutral-50 transition-colors">
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-900 text-sm truncate">{cls.title}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{cls.style} · {cls.level}</p>
                </div>
                <div className="w-20 text-center">
                  <span className={`text-[15px] font-bold ${(cls.metrics?.contacts ?? 0) > 0 ? 'text-green-text' : 'text-neutral-400'}`}>
                    {cls.metrics?.contacts ?? 0}
                  </span>
                </div>
                <div className="w-16 text-center">
                  <span className="text-[15px] font-bold text-neutral-700">
                    {cls.metrics?.views ?? 0}
                  </span>
                </div>
                <div className="w-20 text-center">
                  <span className="text-[15px] font-bold text-neutral-700">
                    {cls.metrics?.saved ?? 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[12px] text-neutral-400 mt-4">
        Los contactos se registran cuando un alumno hace clic en WhatsApp o Instagram desde el detalle de tu clase.
      </p>
    </div>
  );
}
