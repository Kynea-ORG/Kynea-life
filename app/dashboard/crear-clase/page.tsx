import { fetchClassById, fetchAssignableProfiles } from '@/lib/classes/queries';
import { fetchDanceStyles, fetchClassLevels } from '@/lib/catalog/queries';
import { getUser } from '@/lib/auth/getUser';
import { getCurrentProfile } from '@/lib/profiles/queries';
import { isSuperuserModeActive } from '@/lib/auth/superuser';
import { redirect } from 'next/navigation';
import CrearClaseForm from './CrearClaseForm';
import type { DanceClass } from '@/lib/types';

interface PageProps {
  searchParams: Promise<{ edit?: string }>;
}

export default async function CrearClasePage({ searchParams }: PageProps) {
  const user = await getUser();
  if (!user) redirect('/login');

  const [profile, isSuperuser] = await Promise.all([
    getCurrentProfile(),
    isSuperuserModeActive(),
  ]);

  if (!isSuperuser && (!profile?.role || !['profesor', 'academia'].includes(profile.role))) {
    redirect('/dashboard/alumno');
  }

  const isAcademiaPending = !isSuperuser && profile?.role === 'academia' && !profile?.academia_approved_at;

  const params = await searchParams;

  const [danceStyles, levels, editClass, assignableProfiles] = await Promise.all([
    fetchDanceStyles(),
    fetchClassLevels(),
    params.edit ? fetchClassById(params.edit) : Promise.resolve(null),
    isSuperuser ? fetchAssignableProfiles() : Promise.resolve([]),
  ]);

  return (
    <CrearClaseForm
      key={params.edit ?? 'new'}
      classId={params.edit ?? null}
      editClass={editClass as DanceClass | null}
      danceStyles={danceStyles.map(s => s.name)}
      levels={levels.map(l => l.name)}
      academiaPending={isAcademiaPending}
      isSuperuser={isSuperuser}
      assignableProfiles={assignableProfiles}
    />
  );
}
