import { buildGoogleMapsUrl } from '@/lib/utils';
import { pickInitialSchedule } from './dates';
import type { BookingPaymentMethod, BookingStatus, CancellationPolicy, ClassSession, MyBooking, TeacherBooking } from './types';

const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '');

export function mapSessionRow(
  classId: string,
  row: {
    id: string;
    session_date: string;
    start_time: string;
    end_time: string;
    capacity: number | null;
    taken: number;
    already_booked?: boolean | null;
  },
): ClassSession {
  return {
    id: row.id,
    classId,
    date: row.session_date,
    startTime: hhmm(row.start_time),
    endTime: hhmm(row.end_time),
    capacity: row.capacity,
    taken: Number(row.taken ?? 0),
    status: 'open',
    ...(row.already_booked != null ? { alreadyBooked: Boolean(row.already_booked) } : {}),
  };
}

/** Cupos que quedan en una fecha; null si no tiene límite. */
export function sessionSpotsLeft(s: Pick<ClassSession, 'capacity' | 'taken'>): number | null {
  return s.capacity == null ? null : Math.max(s.capacity - s.taken, 0);
}

interface MyBookingRow {
  id: string;
  status: string;
  seats: number;
  price_amount: number | string;
  currency: string;
  payment_method: string;
  created_at: string;
  cancelled_at: string | null;
  class: {
    id: string; title: string; slug: string | null; type: string; cover_image: string | null; modality: string;
    cancellation_policy: string | null; start_date: string | null; end_date: string | null;
    contact_mode?: string | null;
    footwear?: string[] | null; clothing?: string | null; to_bring?: string[] | null; requirements?: string[] | null;
    venue: {
      name: string | null; address: string | null; reference?: string | null;
      maps_url?: string | null; place_id?: string | null; lat?: number | null; lng?: number | null;
      city: string | null;
    } | null;
    teacher?: {
      name: string | null;
      photo_url: string | null;
      whatsapp?: string | null;
      instagram?: string | null;
      show_whatsapp?: boolean | null;
    } | null;
    class_schedules?: { day_of_week: number; start_time: string; end_time: string }[] | null;
    class_styles?: { is_main: boolean; dance_styles: { slug: string | null } | null }[] | null;
  } | null;
  student_note?: string | null;
  session: { id: string; session_date: string; start_time: string; end_time: string } | null;
}

export function mapMyBookingRow(row: MyBookingRow): MyBooking {
  const c = row.class;
  const rawSchedules = c?.class_schedules ?? [];
  const firstSchedule = pickInitialSchedule(rawSchedules, c?.start_date);
  const styles = c?.class_styles ?? [];
  const styleSlug = (styles.find(s => s.is_main) ?? styles[0])?.dance_styles?.slug ?? undefined;
  const isOnline = c?.modality === 'Online';
  const mapsUrl = isOnline
    ? undefined
    : buildGoogleMapsUrl({
        placeId: c?.venue?.place_id ?? undefined,
        lat: c?.venue?.lat ?? undefined,
        lng: c?.venue?.lng ?? undefined,
        address: c?.venue?.address ?? undefined,
      }) ?? c?.venue?.maps_url ?? undefined;

  return {
    id: row.id,
    status: row.status as BookingStatus,
    seats: row.seats,
    priceAmount: Number(row.price_amount),
    currency: row.currency,
    paymentMethod: row.payment_method as BookingPaymentMethod,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at ?? undefined,
    class: {
      id: c?.id ?? '',
      title: c?.title ?? 'Clase no disponible',
      slug: c?.slug ?? undefined,
      type: c?.type ?? '',
      styleSlug,
      coverImage: c?.cover_image ?? undefined,
      modality: c?.modality ?? '',
      cancellationPolicy: (c?.cancellation_policy as CancellationPolicy) ?? 'moderada',
      startDate: c?.start_date ?? undefined,
      endDate: c?.end_date ?? undefined,
      venueName: c?.venue?.name ?? undefined,
      address: c?.venue?.address ?? undefined,
      reference: c?.venue?.reference ?? undefined,
      mapsUrl,
      city: c?.venue?.city ?? undefined,
      startTime: firstSchedule?.start_time ? hhmm(firstSchedule.start_time) : undefined,
      endTime: firstSchedule?.end_time ? hhmm(firstSchedule.end_time) : undefined,
      schedules: rawSchedules.map(s => ({
        dayOfWeek: s.day_of_week,
        startTime: hhmm(s.start_time),
        endTime: hhmm(s.end_time),
      })),
      days: [...new Set(rawSchedules.map(s => s.day_of_week))].sort((a, b) => a - b),
      teacherName: c?.teacher?.name ?? undefined,
      teacherPhoto: c?.teacher?.photo_url ?? undefined,
      teacherWhatsapp: c?.teacher?.whatsapp?.trim() || undefined,
      teacherInstagram: c?.teacher?.instagram?.trim() || undefined,
      teacherShowWhatsapp: c?.teacher?.show_whatsapp ?? undefined,
      contactMode: (c?.contact_mode === 'instagram' || c?.contact_mode === 'both' ? c.contact_mode : c?.contact_mode === 'whatsapp' ? 'whatsapp' : undefined),
      footwear: c?.footwear ?? [],
      clothing: c?.clothing ?? undefined,
      toBring: c?.to_bring ?? [],
      requirements: c?.requirements ?? [],
    },
    note: row.student_note ?? undefined,
    session: row.session
      ? { id: row.session.id, date: row.session.session_date, startTime: hhmm(row.session.start_time), endTime: hhmm(row.session.end_time) }
      : undefined,
  };
}

interface TeacherBookingRow {
  booking_id: string; class_id: string; class_title: string; class_modality?: string | null; class_end_date?: string | null;
  session_id: string | null; session_date: string | null; session_status?: string | null;
  start_time: string | null; capacity: number | null; student_id: string; student_name: string;
  student_photo: string | null; student_bio: string | null;
  student_whatsapp?: string | null;
  student_instagram: string | null; student_since: string | null; student_note: string | null; student_prior: number | null;
  seats: number; status: string;
  confirmed_at?: string | null;
  price_amount: number | string; currency: string; payment_method: string; created_at: string;
}

export function mapTeacherBookingRow(row: TeacherBookingRow): TeacherBooking {
  return {
    id: row.booking_id,
    classId: row.class_id,
    classTitle: row.class_title,
    classModality: row.class_modality ?? undefined,
    classEndDate: row.class_end_date ?? undefined,
    sessionId: row.session_id ?? undefined,
    sessionDate: row.session_date ?? undefined,
    sessionStatus: row.session_status === 'cancelled' ? 'cancelled' : row.session_status === 'open' ? 'open' : undefined,
    startTime: row.start_time ? hhmm(row.start_time) : undefined,
    capacity: row.capacity ?? undefined,
    studentId: row.student_id,
    studentName: row.student_name,
    studentPhoto: row.student_photo ?? undefined,
    studentBio: row.student_bio?.trim() || undefined,
    studentWhatsapp: row.student_whatsapp?.trim() || undefined,
    studentInstagram: row.student_instagram ?? undefined,
    studentSince: row.student_since ?? undefined,
    note: row.student_note?.trim() || undefined,
    priorBookings: row.student_prior ?? 0,
    seats: row.seats,
    status: row.status as BookingStatus,
    confirmedAt: row.confirmed_at ?? undefined,
    priceAmount: Number(row.price_amount),
    currency: row.currency,
    paymentMethod: row.payment_method as BookingPaymentMethod,
    createdAt: row.created_at,
  };
}
