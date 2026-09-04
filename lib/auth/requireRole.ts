import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/getUser';
import { getCurrentProfile } from '@/lib/profiles/queries';

type Role = 'alumno' | 'profesor' | 'academia';

/**
 * Server-only guard for role-exclusive dashboard routes.
 * proxy.ts only checks "is logged in?" — this checks "is this role allowed here?".
 * Assumes app/dashboard/layout.tsx already redirected unauthenticated users
 * and users with a missing profile row.
 */
export async function requireRole(allowed: Role[]) {
  const user = await getUser();
  if (!user) redirect('/login');

  const profile = await getCurrentProfile();

  if (!profile?.role || !allowed.includes(profile.role)) {
    redirect('/dashboard/alumno');
  }
}
