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
    onSuccess: (path: string, notice?: string | null) => void;
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

  // Alumnos don't go through onboarding — mark them done so proxy.ts allows full navigation.
  if (profile?.role === 'alumno') {
    await supabase.auth.updateUser({ data: { onboarding_done: true } });
  }

  const notice = options.expectedRole !== undefined
    ? roleMismatchNotice(options.expectedRole, profile?.role ?? null)
    : null;

  options.onSuccess(dest, notice);
}
