import { fetchClassById } from '@/lib/classes/queries';
import { fetchDanceStyles, fetchClassLevels } from '@/lib/catalog/queries';
import { getUser } from '@/lib/auth/getUser';
import { getCurrentProfile } from '@/lib/profiles/queries';
import { redirect } from 'next/navigation';
import CrearClaseForm from './CrearClaseForm';
import type { DanceClass } from '@/lib/types';

interface PageProps {
  searchParams: Promise<{ edit?: string }>;
}

export default async function CrearClasePage({ searchParams }: PageProps) {
  const user = await getUser();
  if (!user) redirect('/login');

  const profile = await getCurrentProfile();

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
