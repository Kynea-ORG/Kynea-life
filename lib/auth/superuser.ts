import { cache } from 'react';
import { cookies } from 'next/headers';
import { getCurrentProfile } from '@/lib/profiles/queries';

export const SUPERUSER_COOKIE_NAME = 'kynea_superuser_mode';

/**
 * Devuelve true únicamente cuando:
 * 1) El usuario autenticado real tiene `is_admin = true` en su perfil de base de datos, Y
 * 2) Ha activado explícitamente el modo Superusuario mediante el switch (`kynea_superuser_mode=1`).
 *
 * Si una cuenta que no es admin manipula la cookie manualmente, esta función devuelve `false`.
 */
export const isSuperuserModeActive = cache(async (): Promise<boolean> => {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) return false;

  const cookieStore = await cookies();
  return cookieStore.get(SUPERUSER_COOKIE_NAME)?.value === '1';
});
