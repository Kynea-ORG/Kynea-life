import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockSingle = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
    })),
    rpc: mockRpc,
  })),
}));

import { fetchAdminCreatedUsers, fetchIsAdmin } from './queries';

describe('fetchIsAdmin', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockSingle.mockReset();
  });

  it('returns false when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    expect(await fetchIsAdmin()).toBe(false);
    expect(mockSingle).not.toHaveBeenCalled();
  });

  it('returns true when the profile row has is_admin: true', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSingle.mockResolvedValue({ data: { is_admin: true }, error: null });

    expect(await fetchIsAdmin()).toBe(true);
  });

  it('returns false when the profile row has is_admin: false', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSingle.mockResolvedValue({ data: { is_admin: false }, error: null });

    expect(await fetchIsAdmin()).toBe(false);
  });

  it('returns false (fail-closed) when the query errors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });

    expect(await fetchIsAdmin()).toBe(false);
  });
});

describe('fetchAdminCreatedUsers', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('maps rows and computes total/totalPages from total_count', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { id: 'u1', name: 'Ana', email: 'ana@example.com', role: 'profesor', created_at: '2026-01-01T00:00:00Z', created_by: 'admin-1', creator_name: 'Admin', total_count: 25 },
        { id: 'u2', name: null, email: 'sin-nombre@example.com', role: 'academia', created_at: '2026-01-02T00:00:00Z', created_by: 'admin-1', creator_name: null, total_count: 25 },
      ],
      error: null,
    });

    const result = await fetchAdminCreatedUsers(2);

    expect(mockRpc).toHaveBeenCalledWith('admin_list_created_users', { p_page: 2, p_page_size: 20 });
    expect(result.total).toBe(25);
    expect(result.totalPages).toBe(2);
    expect(result.page).toBe(2);
    expect(result.users).toEqual([
      { id: 'u1', name: 'Ana', email: 'ana@example.com', role: 'profesor', createdAt: '2026-01-01T00:00:00Z', createdBy: 'admin-1', creatorName: 'Admin' },
      { id: 'u2', name: null, email: 'sin-nombre@example.com', role: 'academia', createdAt: '2026-01-02T00:00:00Z', createdBy: 'admin-1', creatorName: null },
    ]);
  });

  it('returns an empty page with total 0 and totalPages 1 when there are zero rows', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const result = await fetchAdminCreatedUsers(1);

    expect(result).toEqual({ users: [], total: 0, page: 1, totalPages: 1 });
  });

  it('returns an empty page (not an error) when requesting a page past the end', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const result = await fetchAdminCreatedUsers(99);

    expect(result.users).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(99);
  });

  it('fails closed and logs when the RPC errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const result = await fetchAdminCreatedUsers(1);

    expect(result).toEqual({ users: [], total: 0, page: 1, totalPages: 1 });
    expect(consoleSpy).toHaveBeenCalledWith('fetchAdminCreatedUsers error:', 'boom');
    consoleSpy.mockRestore();
  });
});
