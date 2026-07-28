import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fetchIsAdmin } from '@/lib/admin/queries';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Silent redirect on purpose — no 404, no "forbidden" page, no hint that
  // /dashboard/admin exists as a distinct gated route for non-admins.
  if (!(await fetchIsAdmin())) redirect('/dashboard');

  return <>{children}</>;
}
