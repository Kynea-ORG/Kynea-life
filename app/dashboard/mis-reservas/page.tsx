import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/getUser';
import { getCurrentProfile } from '@/lib/profiles/queries';
import { fetchMyBookings } from '@/lib/bookings/queries';
import { getTodayLima } from '@/lib/classes/helpers';
import MisReservasClient from './MisReservasClient';

export default async function MisReservasPage() {
  const user = await getUser();
  if (!user) redirect('/login');
  const [profile, bookings] = await Promise.all([
    getCurrentProfile(),
    fetchMyBookings(user.id),
  ]);
  const isTeacherOrAcademy = profile?.role === 'profesor' || profile?.role === 'academia';
  return (
    <MisReservasClient
      bookings={bookings}
      today={getTodayLima()}
      showReceivedLink={isTeacherOrAcademy}
    />
  );
}
