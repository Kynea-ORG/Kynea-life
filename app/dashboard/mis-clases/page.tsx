import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/getUser';
import { getCurrentProfile } from '@/lib/profiles/queries';
import { isSuperuserModeActive } from '@/lib/auth/superuser';
import { fetchTeacherClasses, fetchSuperuserClasses } from '@/lib/classes/queries';
import DashboardTableSkeleton from '@/components/skeletons/DashboardTableSkeleton';
import MisClasesClient from './MisClasesClient';

export default async function MisClasesPage() {
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
  const classes = isSuperuser ? await fetchSuperuserClasses() : await fetchTeacherClasses(user.id);

  // MisClasesClient reads ?published=1 via useSearchParams (publish success
  // toast), which requires a Suspense boundary.
  return (
    <Suspense fallback={<DashboardTableSkeleton />}>
      <MisClasesClient initialClasses={classes} academiaPending={isAcademiaPending} isSuperuser={isSuperuser} />
    </Suspense>
  );
}
