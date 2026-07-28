import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockSingle = vi.fn();

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
  })),
}));

import { fetchIsAdmin } from './queries';

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
