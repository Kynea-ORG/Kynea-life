import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { fetchTeacherClasses } from '@/lib/classes/queries';
import MisClasesClient from './MisClasesClient';

export default async function MisClasesPage() {
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
  const classes = await fetchTeacherClasses(user.id);

  // MisClasesClient reads ?published=1 via useSearchParams (publish success
  // toast), which requires a Suspense boundary.
  return (
    <Suspense>
      <MisClasesClient initialClasses={classes} academiaPending={isAcademiaPending} />
    </Suspense>
  );
}
