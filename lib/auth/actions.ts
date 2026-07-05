'use server';
import { createClient } from '@/lib/supabase/server';

export async function completeOAuthRegistration(role: 'alumno' | 'profesor' | 'academia') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', user.id);

  if (error) throw new Error(error.message);

  // Sync role to user_metadata so proxy.ts can read it from the JWT without a DB query.
  // Alumnos don't need onboarding — mark them done immediately.
  await supabase.auth.updateUser({
    data: {
      role,
      ...(role === 'alumno' ? { onboarding_done: true } : {}),
    },
  });
}
