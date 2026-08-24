import { fetchClassById } from '@/lib/classes/queries';
import { fetchDanceStyles, fetchClassLevels } from '@/lib/catalog/queries';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CrearClaseForm from './CrearClaseForm';
import type { DanceClass } from '@/lib/types';

interface PageProps {
  searchParams: Promise<{ edit?: string }>;
}

export default async function CrearClasePage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academia_approved_at')
    .eq('id', user.id)
    .single();

  if (!profile?.role || !['profesor', 'academia'].includes(profile.role)) {
    redirect('/dashboard/alumno');
  }

  const isAcademiaPending = profile?.role === 'academia' && !profile?.academia_approved_at;

  const params = await searchParams;

  const [danceStyles, levels, editClass] = await Promise.all([
    fetchDanceStyles(),
    fetchClassLevels(),
    params.edit ? fetchClassById(params.edit) : Promise.resolve(null),
  ]);

  return (
    <CrearClaseForm
      key={params.edit ?? 'new'}
      classId={params.edit ?? null}
      editClass={editClass as DanceClass | null}
      danceStyles={danceStyles.map(s => s.name)}
      levels={levels.map(l => l.name)}
      academiaPending={isAcademiaPending}
    />
  );
}
