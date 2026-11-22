// Tipos de reservas (migración 70). El estado de una reserva y el modo de reserva de una clase
// viven en la base de datos; aquí solo se espejan para la app.

export type BookingMode = 'none' | 'class' | 'session';
export type CancellationPolicy = 'flexible' | 'moderada' | 'estricta';
export type ReminderHoursBefore = 1 | 2 | 4 | 12 | 24 | 48;
export type BookingStatus =
  | 'hold'
  | 'pending_payment'
  | 'pending_confirmation'
  | 'confirmed'
  | 'cancelled'
  | 'expired'
  | 'attended'
  | 'no_show';
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
  /** true si el usuario actual ya tiene una reserva registrada en esta fecha. */
  alreadyBooked?: boolean;
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
    styleSlug?: string;
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
    /** Horario de la primera sesión correspondiente al inicio (para reservas de clase completa). */
    startTime?: string;
    endTime?: string;
    /** Horarios semanales completos (0 = lunes … 6 = domingo), usados por el calendario. */
    schedules?: { dayOfWeek: number; startTime: string; endTime: string }[];
    /** Días de la semana en que hay clase (0 = lunes … 6 = domingo). */
    days: number[];
    teacherName?: string;
    teacherPhoto?: string;
    teacherWhatsapp?: string;
    teacherInstagram?: string;
    teacherShowWhatsapp?: boolean;
    contactMode?: 'whatsapp' | 'instagram' | 'both';
    footwear: string[];
    clothing?: string;
    toBring: string[];
    requirements: string[];
  };
  note?: string;
  session?: { id: string; date: string; startTime: string; endTime: string };
}

/** Reserva vista por el profesor (panel "Reservas recibidas"). */
export interface TeacherBooking {
  id: string;
  classId: string;
  classTitle: string;
  classModality?: string;
  classEndDate?: string;
  sessionId?: string;
  sessionDate?: string;
  sessionStatus?: 'open' | 'cancelled';
  startTime?: string;
  endTime?: string;
  /** Cupo total de la fecha (o de la clase); null = sin límite. */
  capacity?: number;
  studentId: string;
  studentName: string;
  studentPhoto?: string;
  studentBio?: string;
  studentWhatsapp?: string;
  studentInstagram?: string;
  studentSince?: string;
  note?: string;
  /** Asistencias previas registradas del alumno con este profesor/academia (attended o confirmed de fecha pasada, excluyendo esta reserva). */
  priorBookings: number;
  /** Inasistencias previas registradas del alumno con este profesor/academia (no_show, excluyendo esta reserva). */
  priorNoShows: number;
  seats: number;
  status: BookingStatus;
  confirmedAt?: string;
  priceAmount: number;
  currency: string;
  paymentMethod: BookingPaymentMethod;
  createdAt: string;
}

export type BookingActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? Record<never, never> : { data: T }))
  | { ok: false; error: { code: string; message: string } };
