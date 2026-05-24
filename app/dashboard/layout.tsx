import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardSidebar from './DashboardSidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, role, photo_url')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <DashboardSidebar profile={profile} />
      <main className="flex-1 min-w-0 pt-14 md:pt-0 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}
