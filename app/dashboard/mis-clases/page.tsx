import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/getUser';
import { getCurrentProfile } from '@/lib/profiles/queries';
import { fetchTeacherClasses } from '@/lib/classes/queries';
import MisClasesClient from './MisClasesClient';

export default async function MisClasesPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const profile = await getCurrentProfile();

  if (!profile?.role || !['profesor', 'academia'].includes(profile.role)) {
    redirect('/dashboard/alumno');
  }

  const isAcademiaPending = profile?.role === 'academia' && !profile?.academia_approved_at;
  const classes = await fetchTeacherClasses(user.id);

  // MisClasesClient reads ?published=1 via useSearchParams (publish success
  // toast), which requires a Suspense boundary.
  return (
    <Suspense>
      <MisClasesClient initialClasses={classes} academiaPending={isAcademiaPending} />
    </Suspense>
  );
}
