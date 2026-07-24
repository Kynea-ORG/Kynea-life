import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ConfiguracionClient from './ConfiguracionClient';

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, show_whatsapp, show_spots')
    .eq('id', user.id)
    .single();

  return (
    <ConfiguracionClient
      role={profile?.role ?? 'alumno'}
      showWhatsapp={profile?.show_whatsapp ?? true}
      showSpots={profile?.show_spots ?? true}
    />
  );
}
