import { createClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS entirely. Server-only: never import this
// from a Client Component or anything that ships to the browser. Reserved for
// operations the anon/user client can't do by design, like deleting an
// auth.users row (supabase.auth.admin.* requires the service role key).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada en el entorno del servidor.');
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
