import { createClient } from '@/lib/supabase/server';
import { fetchTeacherClasses } from '@/lib/classes/queries';
import MisClasesClient from './MisClasesClient';

export default async function MisClasesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const classes = user ? await fetchTeacherClasses(user.id) : [];

  return <MisClasesClient initialClasses={classes} />;
}
