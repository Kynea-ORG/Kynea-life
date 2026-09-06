import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetUser = vi.fn();
const mockSingle = vi.fn();
const mockRpc = vi.fn();
// `fetchIsAdmin`/`fetchAdminCreatedUsers` only ever need `.select().eq().single()`,
// so that's the default shape here — `fetchUserCounts` below reconfigures
// this per-test (its `.select(..., {count,head:true})` chain is awaitable
// directly, not `.single()`-terminated) and restores it afterwards.
const defaultFromImpl = () => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      single: mockSingle,
    })),
  })),
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return shape varies per describe block (see fetchUserCounts below)
const mockFrom = vi.fn<(table: string) => any>(defaultFromImpl);

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

import { fetchAdminCreatedUsers, fetchIsAdmin, fetchUserCounts } from './queries';

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

describe('fetchUserCounts', () => {
  // `Promise.all` fires the 7 count queries in this fixed order (see
  // fetchUserCounts): total, alumno, profesor, academia, academiaApproved,
  // requestsPending, requestsRejected.
  // Each `.from(...).select(...)` chain is directly awaitable in the
  // real client (a PostgrestFilterBuilder), same as `.eq()`/`.not()` calls
  // on it — this stub mirrors that by making every link in the chain both
  // chainable *and* thenable, resolving to that call's queued result.
  function mockCountQueries(results: Array<{ count: number | null; error: { message: string } | null }>) {
    let call = 0;
    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => {
        const result = results[call++];
        const builder = {
          eq: vi.fn(() => builder),
          not: vi.fn(() => builder),
          then: (resolve: (v: typeof result) => void) => Promise.resolve(result).then(resolve),
        };
        return builder;
      }),
    }));
  }

  afterEach(() => {
    mockFrom.mockImplementation(defaultFromImpl);
  });

  it('aggregates total/role counts and counts approved, pending, and rejected academia requests', async () => {
    mockCountQueries([
      { count: 34, error: null }, // total
      { count: 1, error: null },  // alumno
      { count: 31, error: null }, // profesor
      { count: 2, error: null },  // academia
      { count: 2, error: null },  // academiaApproved
      { count: 3, error: null },  // requestsPending
      { count: 1, error: null },  // requestsRejected
    ]);

    expect(await fetchUserCounts()).toEqual({
      total: 34, alumno: 1, profesor: 31, academia: 2,
      academiaApproved: 2, academiaPending: 3, academiaRejected: 1,
    });
  });

  it('treats every missing count as 0', async () => {
    mockCountQueries([
      { count: null, error: null },
      { count: null, error: null },
      { count: null, error: null },
      { count: null, error: null },
      { count: null, error: null },
      { count: null, error: null },
      { count: null, error: null },
    ]);

    expect(await fetchUserCounts()).toEqual({
      total: 0, alumno: 0, profesor: 0, academia: 0,
      academiaApproved: 0, academiaPending: 0, academiaRejected: 0,
    });
  });

  it('logs (but does not throw) when one of the count queries errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCountQueries([
      { count: 34, error: null },
      { count: 1, error: null },
      { count: 31, error: null },
      { count: null, error: { message: 'boom' } }, // academia
      { count: null, error: null },
      { count: null, error: null },
      { count: null, error: null },
    ]);

    const result = await fetchUserCounts();

    expect(result.academia).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith('fetchUserCounts (academia) error:', 'boom');
    consoleSpy.mockRestore();
  });
});
