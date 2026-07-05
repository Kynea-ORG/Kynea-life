import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fetchSavedClasses } from '@/lib/classes/queries';
import AlumnoClient from './AlumnoClient';

export default async function AlumnoDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single();

  const savedClasses = await fetchSavedClasses(user.id);

  return (
    <AlumnoClient
      savedClasses={savedClasses}
      userName={profile?.name ?? ''}
    />
  );
}
