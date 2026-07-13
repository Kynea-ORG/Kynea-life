import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { fetchTeacherClasses } from '@/lib/classes/queries';
import MisClasesClient from './MisClasesClient';

export default async function MisClasesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const classes = user ? await fetchTeacherClasses(user.id) : [];

  // MisClasesClient reads ?published=1 via useSearchParams (publish success
  // toast), which requires a Suspense boundary.
  return (
    <Suspense>
      <MisClasesClient initialClasses={classes} />
    </Suspense>
  );
}
