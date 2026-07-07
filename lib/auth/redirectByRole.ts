import type { SupabaseClient } from '@supabase/supabase-js';

export async function redirectByRole(
  supabase: SupabaseClient,
  options: {
    onSuccess: (path: string) => void;
    onError: (msg: string) => void;
    refresh?: () => void;
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

  options.onSuccess(dest);
}
