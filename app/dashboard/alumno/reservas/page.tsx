import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/getUser';
import { fetchMyBookings } from '@/lib/bookings/queries';
import { getTodayLima } from '@/lib/classes/helpers';
import MisReservasClient from './MisReservasClient';

export default async function MisReservasPage() {
  const user = await getUser();
  if (!user) redirect('/login');
  const bookings = await fetchMyBookings(user.id);
  return <MisReservasClient bookings={bookings} today={getTodayLima()} />;
}
