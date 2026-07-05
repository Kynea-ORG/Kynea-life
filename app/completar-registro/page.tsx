import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CompletarRegistroClient from './CompletarRegistroClient';

export default async function CompletarRegistroPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Proxy already guards this route, but double-check server-side
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login?error=cuenta_incompleta');

  // If the user already has a role, they've completed this step — redirect to their destination
  if (profile.role) {
    redirect(profile.role === 'alumno' ? '/clases' : '/dashboard');
  }

  const userName  = (user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? '') as string;
  const userEmail = user.email ?? '';
  const userAvatar = (user.user_metadata?.avatar_url ?? '') as string;

  return (
    <CompletarRegistroClient
      userName={userName}
      userEmail={userEmail}
      userAvatar={userAvatar}
    />
  );
}
