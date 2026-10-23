import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/profiles/queries';

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
