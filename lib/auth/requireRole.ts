import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Role = 'alumno' | 'profesor' | 'academia';

/**
 * Server-only guard for role-exclusive dashboard routes.
 * proxy.ts only checks "is logged in?" — this checks "is this role allowed here?".
 * Assumes app/dashboard/layout.tsx already redirected unauthenticated users
 * and users with a missing profile row.
 */
export async function requireRole(allowed: Role[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile?.role || !allowed.includes(profile.role)) {
    redirect('/dashboard/alumno');
  }
}
