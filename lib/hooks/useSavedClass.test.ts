// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSavedClass } from './useSavedClass';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

let mockUser: { id: string } | null = null;
vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser, isLoggedIn: !!mockUser }),
}));

const mockTrackSaveClass = vi.fn();
const mockTrackAuthCtaClick = vi.fn();
vi.mock('@/lib/analytics', () => ({
  trackSaveClass: (...args: unknown[]) => mockTrackSaveClass(...args),
  trackAuthCtaClick: (...args: unknown[]) => mockTrackAuthCtaClick(...args),
}));

let mockSupabaseSelectError: unknown = null;
let mockSupabaseSelectData: { class_id: string } | null = null;
let mockSupabaseInsertError: unknown = null;
let mockSupabaseDeleteError: unknown = null;

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () =>
              mockSupabaseSelectError
                ? Promise.reject(mockSupabaseSelectError)
                : Promise.resolve({ data: mockSupabaseSelectData, error: null }),
          }),
        }),
      }),
      insert: () =>
        Promise.resolve({ error: mockSupabaseInsertError }),
      delete: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ error: mockSupabaseDeleteError }),
        }),
      }),
    }),
  }),
}));

describe('useSavedClass', () => {
  const sampleClass = {
    id: 'class-123',
    title: 'Salsa Cubana',
    style: 'Salsa',
    teacher: { id: 'teacher-456' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockSupabaseSelectData = null;
    mockSupabaseSelectError = null;
    mockSupabaseInsertError = null;
    mockSupabaseDeleteError = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('inicia en false cuando no hay usuario autenticado', () => {
    const { result } = renderHook(() => useSavedClass({ cls: sampleClass }));
    expect(result.current.saved).toBe(false);
  });

  it('permite alternar en memoria para invitados cuando requireAuth es false', async () => {
    const { result } = renderHook(() => useSavedClass({ cls: sampleClass }));

    await act(async () => {
      await result.current.toggleSave();
    });

    expect(result.current.saved).toBe(true);
    expect(mockTrackSaveClass).toHaveBeenCalledWith({
      classId: 'class-123',
      className: 'Salsa Cubana',
      classStyle: 'Salsa',
      teacherId: 'teacher-456',
    });
  });

  it('redirige a /login cuando requireAuth es true y el usuario no está autenticado', async () => {
    const { result } = renderHook(() =>
      useSavedClass({ cls: sampleClass, requireAuth: true })
    );

    await act(async () => {
      await result.current.toggleSave();
    });

    expect(mockTrackAuthCtaClick).toHaveBeenCalledWith({
      action: 'login',
      location: 'save_class_gate',
    });
    expect(mockPush).toHaveBeenCalledWith('/login');
    expect(result.current.saved).toBe(false);
  });

  it('guarda en Supabase cuando el usuario está autenticado', async () => {
    mockUser = { id: 'user-789' };
    const { result } = renderHook(() => useSavedClass({ cls: sampleClass }));

    await act(async () => {
      await result.current.toggleSave();
    });

    expect(result.current.saved).toBe(true);
    expect(mockTrackSaveClass).toHaveBeenCalled();
  });

  it('revierte el estado optimista (rollback) si la inserción en Supabase falla', async () => {
    mockUser = { id: 'user-789' };
    mockSupabaseInsertError = { message: 'Database error', code: '500' };

    const { result } = renderHook(() => useSavedClass({ cls: sampleClass }));

    await act(async () => {
      await result.current.toggleSave();
    });

    // Como mockSupabaseInsertError ocurrió, debió revertir a false
    expect(result.current.saved).toBe(false);
  });

  it('sincroniza el estado mediante el evento custom kynea:class-saved-change', () => {
    const { result } = renderHook(() => useSavedClass({ cls: sampleClass }));

    act(() => {
      window.dispatchEvent(
        new CustomEvent('kynea:class-saved-change', {
          detail: { classId: 'class-123', saved: true },
        })
      );
    });

    expect(result.current.saved).toBe(true);
  });
});
