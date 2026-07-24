import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ConfiguracionClient from './ConfiguracionClient';

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return <ConfiguracionClient role={profile?.role ?? 'alumno'} />;
}
