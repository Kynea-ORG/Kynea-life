import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { fetchIsAdmin, fetchPendingAcademiaRequests } from '@/lib/admin/queries';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Silent redirect on purpose — no 404, no "forbidden" page, no hint that
  // /dashboard/admin exists as a distinct gated route for non-admins.
  if (!(await fetchIsAdmin())) redirect('/dashboard');

  const pendingCount = (await fetchPendingAcademiaRequests()).length;

  return (
    <div>
      <div className="flex items-center gap-1 px-6 lg:px-8 pt-6 border-b border-neutral-100">
        <Link href="/dashboard/admin/resumen" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900 px-3 py-2.5 border-b-2 border-transparent hover:border-neutral-300 transition-colors">
          Resumen
        </Link>
        <Link href="/dashboard/admin" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900 px-3 py-2.5 border-b-2 border-transparent hover:border-neutral-300 transition-colors">
          Usuarios
        </Link>
        <Link href="/dashboard/admin/academias" className="flex items-center gap-1.5 text-sm font-semibold text-neutral-600 hover:text-neutral-900 px-3 py-2.5 border-b-2 border-transparent hover:border-neutral-300 transition-colors">
          Solicitudes de academia
          {pendingCount > 0 && (
            <span className="text-[10px] font-bold bg-pink-600 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {pendingCount}
            </span>
          )}
        </Link>
      </div>
      {children}
    </div>
  );
}
