// Tipos de reservas (migración 70). El estado de una reserva y el modo de reserva de una clase
// viven en la base de datos; aquí solo se espejan para la app.

export type BookingMode = 'none' | 'class' | 'session';
export type CancellationPolicy = 'flexible' | 'moderada' | 'estricta';
export type BookingStatus = 'hold' | 'pending_payment' | 'confirmed' | 'cancelled' | 'expired' | 'attended' | 'no_show';
export type BookingPaymentMethod = 'free' | 'pay_at_venue' | 'online';

/** Una fecha concreta de una clase semanal. */
export interface ClassSession {
  id: string;
  classId: string;
  /** YYYY-MM-DD, hora local de la sede. */
  date: string;
  startTime: string;
  endTime: string;
  /** null = sin límite. */
  capacity: number | null;
  /** Cupos ocupados (reservas activas). */
  taken: number;
  status: 'open' | 'cancelled';
}

/** Reserva vista por el alumno ("Mis reservas"). */
export interface MyBooking {
  id: string;
  status: BookingStatus;
  seats: number;
  priceAmount: number;
  currency: string;
  paymentMethod: BookingPaymentMethod;
  createdAt: string;
  cancelledAt?: string;
  class: {
    id: string;
    title: string;
    slug?: string;
    type: string;
    categoria?: string;
    coverImage?: string;
    modality: string;
    cancellationPolicy: CancellationPolicy;
    startDate?: string;
    endDate?: string;
    venueName?: string;
    address?: string;
    reference?: string;
    mapsUrl?: string;
    city?: string;
    /** Horario de la primera sesión semanal (para reservas de la clase completa). */
    startTime?: string;
    endTime?: string;
    /** Días de la semana en que hay clase (0 = lunes … 6 = domingo). */
    days: number[];
    teacherName?: string;
    teacherPhoto?: string;
    footwear: string[];
    clothing?: string;
    toBring: string[];
    requirements: string[];
  };
  note?: string;
  session?: { id: string; date: string; startTime: string; endTime: string };
}

/** Reserva vista por el profesor (panel "Reservas"). */
export interface TeacherBooking {
  id: string;
  classId: string;
  classTitle: string;
  sessionId?: string;
  sessionDate?: string;
  startTime?: string;
  /** Cupo total de la fecha (o de la clase); null = sin límite. */
  capacity?: number;
  studentId: string;
  studentName: string;
  studentPhoto?: string;
  studentBio?: string;
  studentDistrict?: string;
  studentInstagram?: string;
  studentSince?: string;
  note?: string;
  /** Otras reservas del alumno con este profesor (fidelidad). */
  priorBookings: number;
  seats: number;
  status: BookingStatus;
  priceAmount: number;
  currency: string;
  paymentMethod: BookingPaymentMethod;
  createdAt: string;
}

export type BookingActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? Record<never, never> : { data: T }))
  | { ok: false; error: { code: string; message: string } };
