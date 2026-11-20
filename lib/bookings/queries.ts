import { createClient } from '@/lib/supabase/server';
import { mapMyBookingRow, mapSessionRow, mapTeacherBookingRow } from './mappers';
import type { ClassSession, MyBooking, TeacherBooking } from './types';

/** Fechas reservables de una clase "por fecha", con los cupos ocupados de cada una. */
export async function fetchClassSessions(classId: string): Promise<ClassSession[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('list_class_sessions', { p_class_id: classId });
  if (error) {
    console.error('[fetchClassSessions]', error.message);
    return [];
  }
  return ((data ?? []) as Parameters<typeof mapSessionRow>[1][]).map(row => mapSessionRow(classId, row));
}

/** Reservas del usuario que inició sesión (cualquier rol; la RLS ya limita a las suyas). */
export async function fetchMyBookings(userId: string): Promise<MyBooking[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, status, seats, price_amount, currency, payment_method, created_at, cancelled_at,
      student_note,
      class:classes(id, title, slug, type, cover_image, modality, cancellation_policy, start_date, end_date,
        footwear, clothing, to_bring, requirements,
        venue:venues(name, address, reference, maps_url, place_id, lat, lng, city),
        teacher:profiles!teacher_id(name, photo_url),
        class_schedules(day_of_week, start_time, end_time),
        class_styles(is_main, dance_styles(slug))),
      session:class_sessions(id, session_date, start_time, end_time)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[fetchMyBookings]', error.message);
    return [];
  }
  return ((data ?? []) as unknown as Parameters<typeof mapMyBookingRow>[0][]).map(mapMyBookingRow);
}

/**
 * Reservas recibidas por el profesor/academia (RPC: incluye el nombre del alumno, nunca su correo).
 * `includeAll` solo surte efecto si el usuario es admin (modo Superusuario/Admin).
 */
export async function fetchTeacherBookings(
  options?: string | { classId?: string; includeAll?: boolean },
): Promise<TeacherBooking[]> {
  const classId = typeof options === 'string' ? options : options?.classId;
  const includeAll = typeof options === 'object' ? Boolean(options?.includeAll) : false;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('list_teacher_bookings', {
    p_class_id: classId ?? null,
    p_include_all: includeAll,
  });
  if (error) {
    console.error('[fetchTeacherBookings]', error.message);
    return [];
  }
  return ((data ?? []) as Parameters<typeof mapTeacherBookingRow>[0][]).map(mapTeacherBookingRow);
}
