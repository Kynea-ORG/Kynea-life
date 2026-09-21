// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUserLocation } from './useUserLocation';

describe('useUserLocation hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    });
    sessionStorage.clear();
  });

  it('initializes to null location and idle status on mount to prevent SSR hydration mismatch', () => {
    const { result } = renderHook(() => useUserLocation({ autoRequest: false }));
    expect(result.current.location).toBeNull();
    expect(result.current.status).toBe('idle');
  });

  it('restores cached location from sessionStorage after mount', async () => {
    const cached = { lat: -12.12, lng: -77.03, timestamp: Date.now() };
    sessionStorage.setItem('kynea_user_location', JSON.stringify(cached));

    const { result } = renderHook(() => useUserLocation({ autoRequest: false }));

    expect(result.current.location).toBeNull();

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(result.current.location).toEqual({ lat: -12.12, lng: -77.03 });
    expect(result.current.status).toBe('granted');
  });

  it('ignores expired cache in sessionStorage (>30 mins)', async () => {
    const expired = { lat: -12.12, lng: -77.03, timestamp: Date.now() - 35 * 60 * 1000 };
    sessionStorage.setItem('kynea_user_location', JSON.stringify(expired));

    const { result } = renderHook(() => useUserLocation({ autoRequest: false }));

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(result.current.location).toBeNull();
    expect(result.current.status).toBe('idle');
  });

  it('requests geolocation successfully when granted', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((success) => {
        success({
          coords: {
            latitude: -12.09,
            longitude: -77.04,
          },
        });
      }),
    };
    vi.stubGlobal('navigator', { geolocation: mockGeolocation });

    const { result } = renderHook(() => useUserLocation({ autoRequest: true }));

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(result.current.location).toEqual({ lat: -12.09, lng: -77.04 });
    expect(result.current.status).toBe('granted');
    expect(sessionStorage.getItem('kynea_user_location')).toBeTruthy();
  });

  it('handles permission denied properly', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((_, error) => {
        error({ code: 1, message: 'User denied geolocation' });
      }),
    };
    vi.stubGlobal('navigator', { geolocation: mockGeolocation });

    const { result } = renderHook(() => useUserLocation({ autoRequest: true }));

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(result.current.location).toBeNull();
    expect(result.current.status).toBe('denied');
    expect(result.current.error).toBe('Permiso de ubicación denegado');
  });

  it('clearLocation resets state and removes from sessionStorage', async () => {
    const cached = { lat: -12.12, lng: -77.03, timestamp: Date.now() };
    sessionStorage.setItem('kynea_user_location', JSON.stringify(cached));

    const { result } = renderHook(() => useUserLocation({ autoRequest: false }));

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(result.current.location).toBeTruthy();

    act(() => {
      result.current.clearLocation();
    });

    expect(result.current.location).toBeNull();
    expect(result.current.status).toBe('idle');
    expect(sessionStorage.getItem('kynea_user_location')).toBeNull();
  });
});
