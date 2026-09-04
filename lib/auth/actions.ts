'use server';
import { revalidatePath } from 'next/cache';
import { safeRevalidateTag } from '@/lib/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
  await supabase.auth.updateUser({ data: { role } });
}

// Deleting the auth.users row (not just the profiles row) requires the
// service-role admin API — there's no self-service "delete my own auth user"
// call in supabase-js. profiles.id -> auth.users(id) ON DELETE CASCADE takes
// care of profiles/profile_styles/classes/venues/saved_classes underneath it.
export async function deleteAccount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw new Error(error.message);

  safeRevalidateTag('classes', 'max');
  safeRevalidateTag('profiles', 'max');
  safeRevalidateTag('stats', 'max');
  safeRevalidateTag('catalog', 'max');
  revalidatePath('/');
  revalidatePath('/clases');
  revalidatePath('/profesores');

  await supabase.auth.signOut();
}
