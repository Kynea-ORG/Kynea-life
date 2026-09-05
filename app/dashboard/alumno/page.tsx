import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/getUser';
import { getCurrentProfile } from '@/lib/profiles/queries';
import { fetchSavedClasses } from '@/lib/classes/queries';
import AlumnoClient from './AlumnoClient';

export default async function AlumnoDashboardPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const profile = await getCurrentProfile();

  // Espejo del chequeo inverso en app/dashboard/page.tsx (que manda a un
  // alumno para acá) — sin esto, un profesor/academia que entre a esta URL
  // directamente veía el contenido de alumno completo, incluyendo el upsell
  // "¿Quieres enseñar en Kynea?" (sin sentido si ya lo es o es una academia).
  if (profile?.role !== 'alumno') redirect('/dashboard');

  const savedClasses = await fetchSavedClasses(user.id);

  return (
    <AlumnoClient
      savedClasses={savedClasses}
      userName={profile?.name ?? ''}
    />
  );
}
