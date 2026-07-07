import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import DashboardSidebar from './DashboardSidebar';
import NoticeBar from './NoticeBar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, role, photo_url')
    .eq('id', user.id)
    .single();

  // User authenticated but no profile row (trigger failed) — redirect with error param to break loop
  if (!profile) redirect('/login?error=cuenta_incompleta');

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Suspense>
        <NoticeBar />
      </Suspense>
      <div className="flex flex-1 min-h-0">
        <DashboardSidebar profile={profile} />
        <main className="flex-1 min-w-0 pt-14 md:pt-0 pb-20 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
