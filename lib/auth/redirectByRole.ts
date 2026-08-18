import type { SupabaseClient } from '@supabase/supabase-js';

export function roleMismatchNotice(
  incomingRole: string | null,
  profileRole: string | null,
): 'cuenta_existente' | null {
  return incomingRole && profileRole && incomingRole !== profileRole ? 'cuenta_existente' : null;
}

export async function redirectByRole(
  supabase: SupabaseClient,
  options: {
    // `role` is the real profiles.role value (null if the profile row is
    // missing) — added so callers that need to know the actual role, not
    // just the derived path (profesor and academia both route to /dashboard,
    // so `path` alone can't tell them apart), can use it. Only app/login/
    // page.tsx uses it today, for trackLoginSuccess; confirmar-email and
    // reset-password ignore it, they don't fire a login event here.
    onSuccess: (path: string, notice?: string | null, role?: string | null) => void;
    onError: (msg: string) => void;
    refresh?: () => void;
    expectedRole?: string | null;
  }
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    options.onError('Sesión no encontrada. Intenta de nuevo.');
    return;
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  options.refresh?.();
  // If profile is missing (trigger failed), fall back to /clases to avoid dashboard loop
  const dest = profile?.role === 'alumno' ? '/clases' : profile ? '/dashboard' : '/clases';

  // No auto-marking onboarding_done here anymore: alumno now goes through
  // AlumnoWelcome like every other role. If they haven't finished it yet,
  // proxy.ts's own onboarding_done check redirects them to /onboarding
  // regardless of what `dest` says here — this function doesn't need to
  // special-case it.

  const notice = options.expectedRole !== undefined
    ? roleMismatchNotice(options.expectedRole, profile?.role ?? null)
    : null;

  options.onSuccess(dest, notice, profile?.role ?? null);
}
