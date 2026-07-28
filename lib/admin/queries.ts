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
