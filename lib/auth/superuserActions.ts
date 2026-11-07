'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { fetchIsAdmin } from '@/lib/admin/queries';
import { SUPERUSER_COOKIE_NAME } from './superuser';

/**
 * Activa o desactiva el modo Superusuario para un administrador autenticado.
 * No requiere cerrar sesión ni compartir contraseñas: el `auth.uid()` sigue
 * siendo el del admin real, pero el dashboard cambia a la cuenta Superusuario.
 */
export async function switchSuperuserMode(enable: boolean): Promise<{ ok: true }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  if (!(await fetchIsAdmin())) throw new Error('No autorizado');

  const cookieStore = await cookies();
  if (enable) {
    cookieStore.set(SUPERUSER_COOKIE_NAME, '1', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 días
    });
  } else {
    cookieStore.delete(SUPERUSER_COOKIE_NAME);
  }

  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}
