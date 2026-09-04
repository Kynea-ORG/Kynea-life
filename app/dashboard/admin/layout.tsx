import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/getUser';
import { fetchIsAdmin, fetchPendingAcademiaRequests } from '@/lib/admin/queries';
import AdminNav from './AdminNav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');

  // Silent redirect on purpose — no 404, no "forbidden" page, no hint that
  // /dashboard/admin exists as a distinct gated route for non-admins.
  if (!(await fetchIsAdmin())) redirect('/dashboard');

  const pendingCount = (await fetchPendingAcademiaRequests()).length;

  return (
    <div>
      <AdminNav pendingCount={pendingCount} />
      {children}
    </div>
  );
}
