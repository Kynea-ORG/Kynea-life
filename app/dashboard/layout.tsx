import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getUser } from '@/lib/auth/getUser';
import { getCurrentProfile } from '@/lib/profiles/queries';
import DashboardSidebar from './DashboardSidebar';
import NoticeBar from './NoticeBar';
import AcademiaWelcomeModal from './AcademiaWelcomeModal';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');

  const profile = await getCurrentProfile();

  // User authenticated but no profile row (trigger failed) — redirect with error param to break loop
  if (!profile) redirect('/login?error=cuenta_incompleta');

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Suspense>
        <NoticeBar />
      </Suspense>
      {profile.role === 'academia' && profile.academia_approved_at && !profile.academia_welcome_seen_at && (
        <AcademiaWelcomeModal name={profile.name ?? ''} />
      )}
      {profile.role === 'academia' && !profile.academia_approved_at && (
        <div className="bg-yellow-bg border-b border-yellow-dark/30 px-4 py-2.5 text-center">
          <p className="text-[13px] font-semibold text-neutral-800">
            Tu academia está en revisión — podrás publicar clases en cuanto la aprobemos. Mientras tanto puedes configurar tu perfil y guardar borradores.
          </p>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        <DashboardSidebar profile={profile} />
        <main className="flex-1 min-w-0 pt-14 md:pt-0 pb-20 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
