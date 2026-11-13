import type { BookingPaymentMethod, BookingStatus, CancellationPolicy, ClassSession, MyBooking, TeacherBooking } from './types';

const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '');

export function mapSessionRow(
  classId: string,
  row: { id: string; session_date: string; start_time: string; end_time: string; capacity: number | null; taken: number },
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
    footwear?: string[] | null; clothing?: string | null; to_bring?: string[] | null; requirements?: string[] | null;
    venue: { name: string | null; address: string | null; reference?: string | null; maps_url?: string | null; city: string | null } | null;
    teacher?: { name: string | null; photo_url: string | null } | null;
    class_schedules?: { day_of_week: number; start_time: string; end_time: string }[] | null;
  } | null;
  student_note?: string | null;
  session: { id: string; session_date: string; start_time: string; end_time: string } | null;
}

export function mapMyBookingRow(row: MyBookingRow): MyBooking {
  const c = row.class;
  const firstSchedule = [...(c?.class_schedules ?? [])].sort((a, b) => a.day_of_week - b.day_of_week)[0];
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
      coverImage: c?.cover_image ?? undefined,
      modality: c?.modality ?? '',
      cancellationPolicy: (c?.cancellation_policy as CancellationPolicy) ?? 'moderada',
      startDate: c?.start_date ?? undefined,
      endDate: c?.end_date ?? undefined,
      venueName: c?.venue?.name ?? undefined,
      address: c?.venue?.address ?? undefined,
      reference: c?.venue?.reference ?? undefined,
      mapsUrl: c?.venue?.maps_url ?? undefined,
      city: c?.venue?.city ?? undefined,
      startTime: firstSchedule?.start_time ? hhmm(firstSchedule.start_time) : undefined,
      endTime: firstSchedule?.end_time ? hhmm(firstSchedule.end_time) : undefined,
      days: [...new Set((c?.class_schedules ?? []).map(s => s.day_of_week))].sort((a, b) => a - b),
      teacherName: c?.teacher?.name ?? undefined,
      teacherPhoto: c?.teacher?.photo_url ?? undefined,
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
  booking_id: string; class_id: string; class_title: string; session_id: string | null; session_date: string | null;
  start_time: string | null; capacity: number | null; student_id: string; student_name: string;
  student_photo: string | null; student_bio: string | null; student_district?: string | null;
  student_instagram: string | null; student_since: string | null; student_note: string | null; student_prior: number | null;
  seats: number; status: string;
  price_amount: number | string; currency: string; payment_method: string; created_at: string;
}

export function mapTeacherBookingRow(row: TeacherBookingRow): TeacherBooking {
  return {
    id: row.booking_id,
    classId: row.class_id,
    classTitle: row.class_title,
    sessionId: row.session_id ?? undefined,
    sessionDate: row.session_date ?? undefined,
    startTime: row.start_time ? hhmm(row.start_time) : undefined,
    capacity: row.capacity ?? undefined,
    studentId: row.student_id,
    studentName: row.student_name,
    studentPhoto: row.student_photo ?? undefined,
    studentBio: row.student_bio?.trim() || undefined,
    studentDistrict: row.student_district ?? undefined,
    studentInstagram: row.student_instagram ?? undefined,
    studentSince: row.student_since ?? undefined,
    note: row.student_note?.trim() || undefined,
    priorBookings: row.student_prior ?? 0,
    seats: row.seats,
    status: row.status as BookingStatus,
    priceAmount: Number(row.price_amount),
    currency: row.currency,
    paymentMethod: row.payment_method as BookingPaymentMethod,
    createdAt: row.created_at,
  };
}
