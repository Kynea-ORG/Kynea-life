import { redirect } from 'next/navigation';
import Link from 'next/link';
import SmartImage from '@/components/SmartImage';
import { PlusCircle, Upload, BookOpen, Clock, Eye, Users, MessageCircle, ChevronRight, ArrowUpRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth/getUser';
import { getCurrentProfile } from '@/lib/profiles/queries';
import { fetchTeacherClasses } from '@/lib/classes/queries';
import { classUrl } from '@/lib/classes/helpers';
import { getStatusColor, getStatusLabel, formatPrice, formatTimeSlots } from '@/lib/utils';
import AcademiaConversionCard from './AcademiaConversionCard';

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const profile = await getCurrentProfile();

  if (profile?.role === 'alumno') redirect('/dashboard/alumno');

  // Only a profesor can request this — an academia is already one, and an
  // alumno never reaches this page (redirected above). Fetched unconditionally
  // alongside fetchTeacherClasses (both only need user.id) instead of after
  // an `if (profesor)` check, so the two independent queries run in parallel.
  const supabase = await createClient();
  const [conversionRequestResult, classes] = await Promise.all([
    profile?.role === 'profesor'
      ? supabase
          .from('academia_requests')
          .select('status')
          .eq('profile_id', user.id)
          .eq('kind', 'conversion')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    fetchTeacherClasses(user.id),
  ]);
  const conversionStatus: 'pending' | 'approved' | 'rejected' | null = conversionRequestResult.data?.status ?? null;
  const publishedClasses = classes.filter(c => c.status === 'published');
  const draftClasses = classes.filter(c => c.status === 'draft');
  const totalViews = publishedClasses.reduce((acc, c) => acc + c.metrics.views, 0);
  const recentClasses = publishedClasses.slice(0, 3);

  // Sin métrica de 'Profesores' — el roster de academia corre sobre datos
  // mock por ahora, mostrar un conteo real inexistente sería engañoso. Ver
  // docs/TASKS.md sección 8.8.
  //
  // "Visitas a tu perfil" y "Vistas de tus clases" son dos cosas distintas
  // (alguien puede ver tu perfil sin abrir ninguna clase, o llegar directo a
  // una clase sin pasar por tu perfil) pero ligadas — comparten el mismo
  // tratamiento visual (azul) para que se lean como la misma categoría de
  // "atención recibida", a diferencia de "Publicadas" que es un conteo de
  // contenido, no de interés de terceros.
  const METRICS = [
    { label: 'Visitas a tu perfil', value: profile?.views_count ?? 0, icon: Users,    bg: 'bg-blue-pastel-bg', text: 'text-blue-pastel-text', iconBg: 'bg-blue-pastel/30' },
    { label: 'Vistas de tus clases', value: totalViews,              icon: Eye,      bg: 'bg-blue-pastel-bg', text: 'text-blue-pastel-text', iconBg: 'bg-blue-pastel/30' },
    { label: 'Publicadas',           value: publishedClasses.length, icon: BookOpen, bg: 'bg-neutral-50',     text: 'text-neutral-700', iconBg: 'bg-neutral-200' },
  ];

  const firstName = profile?.name?.split(' ')[0] ?? 'profe';

  return (
    <div className="p-6 lg:p-8 w-full max-w-6xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-black text-neutral-900 tracking-snug">Hola, {firstName} 👋</h1>
          <p className="text-neutral-600 text-[15px] mt-1">Aquí tienes el resumen de tu actividad</p>
        </div>
        <div className="hidden sm:flex gap-3">
          <Link href="/dashboard/importar-csv" className="btn-outline btn-sm flex items-center gap-2">
            <Upload className="w-4 h-4" /> Subir clases masivas
          </Link>
          <Link href="/dashboard/crear-clase" className="btn-primary btn-sm flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> Crear clase
          </Link>
        </div>
      </div>

      {profile?.role === 'profesor' && <AcademiaConversionCard initialStatus={conversionStatus} />}

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {METRICS.map(m => {
          const Icon = m.icon;
          return (
            <div key={m.label} className={`${m.bg} card-dash p-5 last:col-span-2 sm:last:col-span-1`}>
              <div className={`w-10 h-10 ${m.iconBg} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className={`w-[18px] h-[18px] ${m.text}`} />
              </div>
              <p className={`text-[28px] font-black ${m.text}`}>{m.value}</p>
              <p className="text-[13px] font-medium text-neutral-600 mt-0.5">{m.label}</p>
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
      <div className="bg-white card-dash mb-6">
        <div className="flex items-center justify-between p-6 border-b border-neutral-100">
          <h2 className="font-bold text-neutral-900 text-[17px]">Clases publicadas</h2>
          <Link href="/dashboard/mis-clases" className="text-[13px] text-neutral-600 font-medium flex items-center gap-1 hover:text-neutral-900">
            Ver todas <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-neutral-50">
          {recentClasses.length === 0 ? (
            <p className="text-[14px] text-neutral-400 px-6 py-8 text-center">Aún no tienes clases publicadas</p>
          ) : recentClasses.map(cls => (
            <div key={cls.id} className="flex items-center gap-4 p-4 hover:bg-neutral-50 transition-colors">
              {cls.coverImage ? (
                <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0">
                  <SmartImage src={cls.coverImage} alt={cls.title} fill sizes="56px" className="object-cover" style={{ objectPosition: cls.coverImagePosition || '50% 50%', transform: `scale(${cls.coverImageZoom || 1})` }} />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-lg bg-neutral-100 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-neutral-900 text-[15px] truncate">{cls.title}</p>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${getStatusColor(cls.status)}`}>
                    {getStatusLabel(cls.status)}
                  </span>
                </div>
                <p className="text-[13px] text-neutral-600 mt-0.5 truncate">{formatTimeSlots(cls.timeSlots)}</p>
                <div className="hidden sm:flex items-center gap-4 mt-1.5">
                  <span className="text-[13px] text-neutral-600 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {cls.metrics.views} vistas
                  </span>
                  <span className="text-[13px] text-neutral-600 flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" /> {cls.metrics.contacts} contactos
                  </span>
                  <span className="text-[13px] font-semibold text-neutral-900">{formatPrice(cls.priceType, cls.price, cls.currency)}</span>
                </div>
                <div className="sm:hidden mt-1.5">
                  <span className="text-[13px] font-semibold text-neutral-900">{formatPrice(cls.priceType, cls.price, cls.currency)}</span>
                </div>
              </div>
              <Link href={classUrl(cls)} className="text-[13px] text-neutral-600 hover:text-neutral-900 flex items-center gap-1 transition-colors shrink-0">
                Ver <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/dashboard/crear-clase" className="flex items-center gap-4 p-5 bg-white card-dash text-neutral-900 hover:shadow-md transition-shadow active:scale-[0.98]">
          <div className="w-12 h-12 bg-primary-bg rounded-lg flex items-center justify-center">
            <PlusCircle className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-bold text-[15px]">Crear nueva clase</p>
            <p className="text-[13px] text-neutral-600">Publica en minutos</p>
          </div>
          <ChevronRight className="w-5 h-5 ml-auto text-neutral-300" />
        </Link>
        <Link href="/dashboard/importar-csv" className="flex items-center gap-4 p-5 bg-white card-dash text-neutral-900 hover:shadow-md transition-shadow active:scale-[0.98]">
          <div className="w-12 h-12 bg-neutral-50 rounded-lg flex items-center justify-center">
            <Upload className="w-6 h-6 text-neutral-600" />
          </div>
          <div>
            <p className="font-bold text-[15px]">Subir clases masivas</p>
            <p className="text-[13px] text-neutral-600">Desde un archivo CSV</p>
          </div>
          <ChevronRight className="w-5 h-5 ml-auto text-neutral-300" />
        </Link>
      </div>
    </div>
  );
}
