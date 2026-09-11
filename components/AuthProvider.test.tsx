// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from './AuthProvider';

afterEach(cleanup);

// Mock Supabase client
const mockGetSession = vi.fn();
const mockGetUser = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: mockFrom,
  }),
}));

function ConsumerComponent() {
  const { user, profile, loading, isLoggedIn } = useAuth();
  return (
    <div>
      <span data-testid="loading">{loading ? 'true' : 'false'}</span>
      <span data-testid="logged-in">{isLoggedIn ? 'true' : 'false'}</span>
      <span data-testid="user-email">{user?.email ?? 'none'}</span>
      <span data-testid="profile-name">{profile?.name ?? 'none'}</span>
    </div>
  );
}

describe('AuthProvider & useAuth', () => {
  it('returns default context value outside AuthProvider safely', () => {
    render(<ConsumerComponent />);
    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('logged-in').textContent).toBe('false');
    expect(screen.getByTestId('user-email').textContent).toBe('none');
  });

  it('loads user and profile when user is authenticated with a local session', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
      error: null,
    });
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@kynea.dance' } },
      error: null,
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'user-123',
          name: 'Bailarín Test',
          role: 'profesor',
          photo_url: null,
          photo_position: null,
          photo_zoom: null,
        },
        error: null,
      }),
    });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>
    );

    // Initial state is loading
    expect(screen.getByTestId('loading').textContent).toBe('true');

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('logged-in').textContent).toBe('true');
    expect(screen.getByTestId('user-email').textContent).toBe('test@kynea.dance');
    expect(screen.getByTestId('profile-name').textContent).toBe('Bailarín Test');
    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });

  it('bypasses network call when visitor is anonymous (no session in cookies/storage)', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockGetUser.mockClear();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('logged-in').textContent).toBe('false');
    expect(screen.getByTestId('user-email').textContent).toBe('none');
    expect(screen.getByTestId('profile-name').textContent).toBe('none');
    // Ensure getUser is never called for anonymous visitors
    expect(mockGetUser).not.toHaveBeenCalled();
  });
});
