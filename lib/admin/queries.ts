import { createClient } from '@/lib/supabase/server';

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
   * (academia_approved_at no nulo) vs. siguen pendientes de revisión. */
  academiaApproved: number;
  academiaPending: number;
};

// Conteo público (profiles_select es USING (true) — ver RLS), pero vive acá
// en vez de lib/stats/queries.ts porque es para el dashboard de admin
// (desglosado por rol), no para el contador combinado profesor+academia de
// la home pública (fetchHomeStats).
export async function fetchUserCounts(): Promise<UserCounts> {
  const supabase = await createClient();
  const [total, alumno, profesor, academia, academiaApproved] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'alumno'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'profesor'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'academia'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'academia').not('academia_approved_at', 'is', null),
  ]);

  for (const [label, result] of [
    ['total', total], ['alumno', alumno], ['profesor', profesor],
    ['academia', academia], ['academiaApproved', academiaApproved],
  ] as const) {
    if (result.error) console.error(`fetchUserCounts (${label}) error:`, result.error.message);
  }

  const academiaCount = academia.count ?? 0;
  const academiaApprovedCount = academiaApproved.count ?? 0;

  return {
    total: total.count ?? 0,
    alumno: alumno.count ?? 0,
    profesor: profesor.count ?? 0,
    academia: academiaCount,
    academiaApproved: academiaApprovedCount,
    academiaPending: Math.max(academiaCount - academiaApprovedCount, 0),
  };
}

export async function fetchIsAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (error) {
    console.error('fetchIsAdmin error:', error.message);
    return false;
  }
  return data?.is_admin === true;
}
