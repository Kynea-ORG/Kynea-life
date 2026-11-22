import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/getUser';
import { getCurrentProfile } from '@/lib/profiles/queries';
import { isSuperuserModeActive } from '@/lib/auth/superuser';
import { fetchTeacherBookings } from '@/lib/bookings/queries';
import { getTodayLima } from '@/lib/classes/helpers';
import ReservasClient from './ReservasClient';

export default async function ReservasPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const [profile, isSuperuser] = await Promise.all([
    getCurrentProfile(),
    isSuperuserModeActive(),
  ]);

  if (!isSuperuser && (!profile?.role || !['profesor', 'academia'].includes(profile.role))) {
    redirect('/dashboard/mis-reservas');
  }

  const bookings = await fetchTeacherBookings({ includeAll: isSuperuser });
  const now = new Date();
  return (
    <ReservasClient
      bookings={bookings}
      today={getTodayLima(now)}
      nowIso={now.toISOString()}
      isSuperuser={isSuperuser}
    />
  );
}
