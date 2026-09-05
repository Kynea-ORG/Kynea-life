import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/getUser';
import { getCurrentProfile } from '@/lib/profiles/queries';
import ConfiguracionClient from './ConfiguracionClient';

export default async function ConfiguracionPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const profile = await getCurrentProfile();

  return (
    <ConfiguracionClient
      role={profile?.role ?? 'alumno'}
      showWhatsapp={profile?.show_whatsapp ?? true}
      showSpots={profile?.show_spots ?? true}
    />
  );
}
