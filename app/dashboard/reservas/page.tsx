import { requireRole } from '@/lib/auth/requireRole';
import { fetchTeacherBookings } from '@/lib/bookings/queries';
import { getTodayLima } from '@/lib/classes/helpers';
import ReservasClient from './ReservasClient';

export default async function ReservasPage() {
  await requireRole(['profesor', 'academia']);
  const bookings = await fetchTeacherBookings();
  return <ReservasClient bookings={bookings} today={getTodayLima()} />;
}
