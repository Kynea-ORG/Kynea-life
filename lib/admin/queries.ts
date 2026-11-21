import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/profiles/queries';
import { classUrl, getTodayLima, isClassExpired } from '@/lib/classes/helpers';
import type { BookingMode } from '@/lib/bookings/types';
import type { ClassType } from '@/lib/types';

export const ADMIN_USERS_PAGE_SIZE = 20;

export type AdminCreatedUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  createdAt: string;
  createdBy: string | null;
  creatorName: string | null;
};

export type AdminCreatedUsersPage = {
  users: AdminCreatedUser[];
  total: number;
  page: number;
  totalPages: number;
};

export async function fetchAdminCreatedUsers(page = 1): Promise<AdminCreatedUsersPage> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_list_created_users', {
    p_page: page,
    p_page_size: ADMIN_USERS_PAGE_SIZE,
  });

  if (error) {
    console.error('fetchAdminCreatedUsers error:', error.message);
    return { users: [], total: 0, page, totalPages: 1 };
  }

  type AdminListCreatedUsersRow = {
    id: string;
    name: string | null;
    email: string | null;
    role: string | null;
    created_at: string;
    created_by: string | null;
    creator_name: string | null;
    total_count: number;
  };

  const rows: AdminListCreatedUsersRow[] = data ?? [];
  const total = Number(rows[0]?.total_count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_USERS_PAGE_SIZE));

  const users: AdminCreatedUser[] = rows.map(row => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    createdBy: row.created_by,
    creatorName: row.creator_name,
  }));

  return { users, total, page, totalPages };
}

export type AcademiaRequestRow = {
  id: string;
  kind: 'signup' | 'conversion';
  ruc: string | null;
  createdAt: string;
  profileId: string;
  profileName: string | null;
  profileRole: string | null;
};

export async function fetchPendingAcademiaRequests(): Promise<AcademiaRequestRow[]> {
  const supabase = await createClient();
  // `!profile_id` disambiguates the embed: academia_requests has two FKs to
  // profiles (profile_id and reviewed_by), so the bare `profiles(...)` embed
  // PostgREST would otherwise try fails with "more than one relationship
  // was found" — silently swallowed below into an empty list, which is why
  // this needs the explicit hint rather than being caught by a type error.
  const { data, error } = await supabase
    .from('academia_requests')
    .select('id, kind, ruc, created_at, profile_id, profiles!profile_id(name, role)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('fetchPendingAcademiaRequests error:', error.message);
    return [];
  }

  type Row = {
    id: string;
    kind: 'signup' | 'conversion';
    ruc: string | null;
    created_at: string;
    profile_id: string;
    profiles: { name: string | null; role: string | null } | { name: string | null; role: string | null }[] | null;
  };

  return (data as Row[] ?? []).map(row => {
    const profile = Array.isArray(row.profiles) ? (row.profiles[0] ?? null) : row.profiles;
    return {
      id: row.id,
      kind: row.kind,
      ruc: row.ruc,
      createdAt: row.created_at,
      profileId: row.profile_id,
      profileName: profile?.name ?? null,
      profileRole: profile?.role ?? null,
    };
  });
}

export type UserCounts = {
  total: number;
  alumno: number;
  profesor: number;
  academia: number;
  /** De las `academia` — cuántas ya pasaron `approve_academia_request()`
   * (academia_approved_at no nulo). */
  academiaApproved: number;
  /** Solicitudes de academia en estado `pending` (signup o conversión) en `academia_requests`. */
  academiaPending: number;
  /** Solicitudes de academia en estado `rejected` en `academia_requests`. */
  academiaRejected: number;
};

// Conteo para el dashboard de admin (desglosado por rol y estado de academias).
export async function fetchUserCounts(): Promise<UserCounts> {
  const supabase = await createClient();
  const [total, alumno, profesor, academia, academiaApproved, requestsPending, requestsRejected] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'alumno'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'profesor'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'academia'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'academia').not('academia_approved_at', 'is', null),
    supabase.from('academia_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('academia_requests').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
  ]);

  for (const [label, result] of [
    ['total', total], ['alumno', alumno], ['profesor', profesor],
    ['academia', academia], ['academiaApproved', academiaApproved],
    ['requestsPending', requestsPending], ['requestsRejected', requestsRejected],
  ] as const) {
    if (result.error) console.error(`fetchUserCounts (${label}) error:`, result.error.message);
  }

  return {
    total: total.count ?? 0,
    alumno: alumno.count ?? 0,
    profesor: profesor.count ?? 0,
    academia: academia.count ?? 0,
    academiaApproved: academiaApproved.count ?? 0,
    academiaPending: requestsPending.count ?? 0,
    academiaRejected: requestsRejected.count ?? 0,
  };
}

export async function fetchIsAdmin(): Promise<boolean> {
  const profile = await getCurrentProfile();
  return profile?.is_admin === true;
}

export const ADMIN_PROFESORES_PAGE_SIZE = 25;

export type AdminProfesor = {
  id: string;
  name: string | null;
  slug: string | null;
  photoUrl: string | null;
  isWoman: boolean;
};

export type AdminProfesoresPage = {
  profesores: AdminProfesor[];
  total: number;
  page: number;
  totalPages: number;
  /** true cuando profiles.is_woman todavía no existe (migración 63 sin aplicar). */
  migrationPending?: boolean;
};

// Lista TODOS los profesores (a diferencia de fetchAdminCreatedUsers, que solo trae las cuentas
// creadas por un admin) para poder etiquetar a las profesoras. profiles es legible para
// cualquier sesión por la policy de SELECT (profesor/academia son públicos), no hace falta RPC.
export async function fetchAdminProfesores(
  { search, page = 1 }: { search?: string; page?: number },
): Promise<AdminProfesoresPage> {
  const supabase = await createClient();
  const from = (page - 1) * ADMIN_PROFESORES_PAGE_SIZE;

  let q = supabase
    .from('profiles')
    .select('id, name, slug, photo_url, is_woman', { count: 'exact' })
    .eq('role', 'profesor');

  // % y _ son comodines de ILIKE: se quitan para que el texto buscado sea literal.
  const term = (search ?? '').replace(/[%_,()]/g, '').trim();
  if (term) q = q.ilike('name', `%${term}%`);

  const { data, count, error } = await q
    .order('name', { ascending: true })
    .range(from, from + ADMIN_PROFESORES_PAGE_SIZE - 1);

  if (error) {
    const migrationPending = error.code === '42703';
    if (!migrationPending) console.error('fetchAdminProfesores error:', error.message);
    return { profesores: [], total: 0, page, totalPages: 1, migrationPending };
  }

  type Row = { id: string; name: string | null; slug: string | null; photo_url: string | null; is_woman: boolean | null };
  const total = count ?? 0;
  return {
    profesores: ((data ?? []) as Row[]).map(r => ({
      id: r.id, name: r.name, slug: r.slug, photoUrl: r.photo_url, isWoman: r.is_woman === true,
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / ADMIN_PROFESORES_PAGE_SIZE)),
  };
}

// ── Resumen global de Clases y Reservas (/dashboard/admin/resumen) ───────────

type EmbedStyle = {
  is_main: boolean;
  dance_styles: { slug: string | null } | { slug: string | null }[] | null;
};

function buildClassHref(cls: {
  slug: string | null;
  type: string | null;
  class_styles?: EmbedStyle[] | null;
} | null | undefined): string | null {
  if (!cls?.slug || !cls.type) return null;
  const styles = cls.class_styles ?? [];
  const picked = styles.find(s => s.is_main) ?? styles[0];
  const ds = picked?.dance_styles;
  const styleSlug = Array.isArray(ds) ? ds[0]?.slug : ds?.slug;
  if (!styleSlug) return null;
  return classUrl({ styleSlug, type: cls.type as ClassType, slug: cls.slug });
}

export type AdminTopClass = {
  id: string;
  title: string;
  viewsCount: number;
  contactsCount: number;
  savedCount: number;
  bookingMode: BookingMode;
  href: string | null;
};

export type AdminClassesSummary = {
  total: number;
  published: number;
  activePublished: number;
  expiredPublished: number;
  draft: number;
  archived: number;
  bookableTotal: number;
  byClassMode: number;
  bySessionMode: number;
  noBookingMode: number;
  byType: {
    'clase-suelta': number;
    taller: number;
    masterclass: number;
    evento: number;
  };
  presencial: number;
  online: number;
  externalOrganizers: number;
  createdBySuperuser: number;
  totalViews: number;
  totalContacts: number;
  totalSaved: number;
  topClasses: AdminTopClass[];
};

function emptyAdminClassesSummary(): AdminClassesSummary {
  return {
    total: 0,
    published: 0,
    activePublished: 0,
    expiredPublished: 0,
    draft: 0,
    archived: 0,
    bookableTotal: 0,
    byClassMode: 0,
    bySessionMode: 0,
    noBookingMode: 0,
    byType: { 'clase-suelta': 0, taller: 0, masterclass: 0, evento: 0 },
    presencial: 0,
    online: 0,
    externalOrganizers: 0,
    createdBySuperuser: 0,
    totalViews: 0,
    totalContacts: 0,
    totalSaved: 0,
    topClasses: [],
  };
}

/** Resumen global de clases en la plataforma (RLS permite lectura completa a is_admin()). */
export async function fetchAdminClassesSummary(now = new Date()): Promise<AdminClassesSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('classes')
    .select(
      'id, title, slug, type, modality, status, end_date, booking_mode, views_count, contacts_count, saved_count, external_organizer_name, created_by_superuser, class_styles(is_main, dance_styles(slug))',
    );

  if (error) {
    console.error('fetchAdminClassesSummary error:', error.message);
    return emptyAdminClassesSummary();
  }

  type Row = {
    id: string;
    title: string | null;
    slug: string | null;
    type: string | null;
    modality: string | null;
    status: string | null;
    end_date: string | null;
    booking_mode: string | null;
    views_count: number | null;
    contacts_count: number | null;
    saved_count: number | null;
    external_organizer_name: string | null;
    created_by_superuser: boolean | null;
    class_styles: EmbedStyle[] | null;
  };

  const today = getTodayLima(now);
  const rows = (data ?? []) as Row[];
  const summary = emptyAdminClassesSummary();
  summary.total = rows.length;

  const publishedRows: Row[] = [];

  for (const r of rows) {
    if (r.status === 'published') {
      summary.published += 1;
      publishedRows.push(r);
      if (isClassExpired({ endDate: r.end_date }, today)) {
        summary.expiredPublished += 1;
      } else {
        summary.activePublished += 1;
      }

      if (r.booking_mode === 'class') {
        summary.bookableTotal += 1;
        summary.byClassMode += 1;
      } else if (r.booking_mode === 'session') {
        summary.bookableTotal += 1;
        summary.bySessionMode += 1;
      } else {
        summary.noBookingMode += 1;
      }
    } else if (r.status === 'draft') {
      summary.draft += 1;
    } else if (r.status === 'archived') {
      summary.archived += 1;
    }

    if (r.type === 'clase-suelta' || r.type === 'taller' || r.type === 'masterclass' || r.type === 'evento') {
      summary.byType[r.type] += 1;
    }

    if (r.modality === 'Online') summary.online += 1;
    else summary.presencial += 1;

    if (r.external_organizer_name) summary.externalOrganizers += 1;
    if (r.created_by_superuser === true) summary.createdBySuperuser += 1;

    summary.totalViews += Number(r.views_count ?? 0);
    summary.totalContacts += Number(r.contacts_count ?? 0);
    summary.totalSaved += Number(r.saved_count ?? 0);
  }

  summary.topClasses = publishedRows
    .sort((a, b) => Number(b.views_count ?? 0) - Number(a.views_count ?? 0))
    .slice(0, 5)
    .map(r => ({
      id: r.id,
      title: r.title ?? 'Sin título',
      viewsCount: Number(r.views_count ?? 0),
      contactsCount: Number(r.contacts_count ?? 0),
      savedCount: Number(r.saved_count ?? 0),
      bookingMode: (r.booking_mode === 'class' || r.booking_mode === 'session' ? r.booking_mode : 'none'),
      href: buildClassHref(r),
    }));

  return summary;
}

export type AdminBookingsSummary = {
  totalBookings: number;
  confirmedUpcomingCount: number;
  confirmedUpcomingSeats: number;
  pendingUpcomingCount: number;
  pendingUpcomingSeats: number;
  confirmedTotal: number;
  cancelledCount: number;
  expiredCount: number;
  rejectedCount: number;
  confirmationRate: number | null;
  last7DaysCount: number;
  last7DaysSeats: number;
  presencialCount: number;
  onlineCount: number;
};

function emptyAdminBookingsSummary(): AdminBookingsSummary {
  return {
    totalBookings: 0,
    confirmedUpcomingCount: 0,
    confirmedUpcomingSeats: 0,
    pendingUpcomingCount: 0,
    pendingUpcomingSeats: 0,
    confirmedTotal: 0,
    cancelledCount: 0,
    expiredCount: 0,
    rejectedCount: 0,
    confirmationRate: null,
    last7DaysCount: 0,
    last7DaysSeats: 0,
    presencialCount: 0,
    onlineCount: 0,
  };
}

const PENDING_BOOKING_STATUSES = new Set<string>(['pending_confirmation', 'hold', 'pending_payment']);
const CONFIRMED_HISTORICAL_STATUSES = new Set<string>(['confirmed', 'attended', 'no_show']);

/** Resumen global de reservas (sin exponer datos personales de alumnos). */
export async function fetchAdminBookingsSummary(now = new Date()): Promise<AdminBookingsSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'status, seats, created_at, cancel_reason, class:classes(modality, start_date, end_date), session:class_sessions(session_date)',
    );

  if (error) {
    console.error('fetchAdminBookingsSummary error:', error.message);
    return emptyAdminBookingsSummary();
  }

  type ClassEmbed = { modality: string | null; start_date?: string | null; end_date?: string | null };
  type SessionEmbed = { session_date?: string | null };
  type BookingRow = {
    status: string;
    seats: number;
    created_at: string;
    cancel_reason?: string | null;
    class: ClassEmbed | ClassEmbed[] | null;
    session?: SessionEmbed | SessionEmbed[] | null;
  };

  const bookings = (data ?? []) as BookingRow[];
  const summary = emptyAdminBookingsSummary();
  summary.totalBookings = bookings.length;

  const today = getTodayLima(now);
  const sevenDaysAgoMs = now.getTime() - 7 * 86_400_000;

  for (const b of bookings) {
    const cls = Array.isArray(b.class) ? (b.class[0] ?? null) : b.class;
    const sess = Array.isArray(b.session) ? (b.session[0] ?? null) : b.session;
    const seats = Number(b.seats ?? 0);

    const effectiveDate = sess?.session_date ?? cls?.end_date ?? cls?.start_date ?? null;
    const isUpcoming = !effectiveDate || effectiveDate >= today;

    if (b.status === 'confirmed' && isUpcoming) {
      summary.confirmedUpcomingCount += 1;
      summary.confirmedUpcomingSeats += seats;
    } else if (PENDING_BOOKING_STATUSES.has(b.status) && isUpcoming) {
      summary.pendingUpcomingCount += 1;
      summary.pendingUpcomingSeats += seats;
    }

    if (CONFIRMED_HISTORICAL_STATUSES.has(b.status)) {
      summary.confirmedTotal += 1;
    } else if (b.status === 'expired') {
      summary.expiredCount += 1;
    } else if (b.status === 'cancelled') {
      summary.cancelledCount += 1;
      if (b.cancel_reason?.toLowerCase().includes('cupo liberado')) {
        summary.rejectedCount += 1;
      }
    }

    const createdMs = Date.parse(b.created_at);
    if (!Number.isNaN(createdMs) && createdMs >= sevenDaysAgoMs) {
      summary.last7DaysCount += 1;
      summary.last7DaysSeats += seats;
    }

    if (cls?.modality === 'Online') summary.onlineCount += 1;
    else summary.presencialCount += 1;
  }

  const resolvedDenom = summary.confirmedTotal + summary.expiredCount + summary.rejectedCount;
  summary.confirmationRate = resolvedDenom > 0
    ? Math.round((summary.confirmedTotal / resolvedDenom) * 100)
    : null;

  return summary;
}
