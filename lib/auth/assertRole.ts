import type { SupabaseClient } from '@supabase/supabase-js';

type Role = 'alumno' | 'profesor' | 'academia';

/**
 * Server action guard for role-exclusive mutations (class management, etc).
 * requireRole() (redirect-based) only protects the page render — a Server
 * Action is its own callable endpoint and can be invoked directly regardless
 * of which page rendered it, so mutations need their own role check too.
 */
export async function assertRole(supabase: SupabaseClient, userId: string, allowed: Role[]) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (!profile?.role || !allowed.includes(profile.role as Role)) {
    throw new Error('No tienes permiso para realizar esta acción.');
  }
}
