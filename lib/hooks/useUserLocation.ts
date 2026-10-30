'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

export interface UserLocation {
  lat: number;
  lng: number;
}

export type UserLocationStatus = 'idle' | 'prompting' | 'granted' | 'denied' | 'unavailable';

const STORAGE_KEY = 'kynea_user_location';
// Cache location for up to 30 minutes in sessionStorage
const CACHE_TTL_MS = 30 * 60 * 1000;

interface CachedLocation {
  lat: number;
  lng: number;
  timestamp: number;
}

function getStoredLocation(): UserLocation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: CachedLocation = JSON.parse(raw);
    if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        return { lat: parsed.lat, lng: parsed.lng };
      }
    }
  } catch {
    // Ignore storage/json errors
  }
  return null;
}

/**
 * Manages user geolocation state for map views:
 * - Automatically requests location permission on mount if autoRequest is true.
 * - Restores cached position from sessionStorage when available.
 * - Tracks permission status: 'idle' | 'prompting' | 'granted' | 'denied' | 'unavailable'.
 * - Provides requestLocation(force) to trigger/re-request geolocation.
 * - Tracks the browser-level permission via the Permissions API (`permission`):
 *   when it is 'denied' the browser will not prompt again, so retrying is
 *   pointless and the UI should explain how to unblock it instead. Once the
 *   user unblocks it in the browser, the hook picks the location up on its own.
 */
export function useUserLocation({ autoRequest = true }: { autoRequest?: boolean } = {}) {
  // Initialize to null/'idle' so initial client render matches SSR HTML (avoids hydration mismatch)
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<UserLocationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  // null = unknown (Permissions API unavailable or not queried yet)
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const requestingRef = useRef(false);

  const requestLocation = useCallback((force = false) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      setError('Geolocalización no soportada en este navegador');
      return Promise.resolve(null);
    }

    if (requestingRef.current && !force) return Promise.resolve(null);
    requestingRef.current = true;
    setStatus('prompting');
    setError(null);

    return new Promise<UserLocation | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          requestingRef.current = false;
          const coords: UserLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLocation(coords);
          setStatus('granted');
          setError(null);
          try {
            sessionStorage.setItem(
              STORAGE_KEY,
              JSON.stringify({ ...coords, timestamp: Date.now() })
            );
          } catch {
            // Ignore storage errors
          }
          resolve(coords);
        },
        (err) => {
          requestingRef.current = false;
          if (err.code === 1 /* GeolocationPositionError.PERMISSION_DENIED */) {
            setStatus('denied');
            setError('Permiso de ubicación denegado');
          } else {
            setStatus('unavailable');
            setError('No se pudo determinar tu ubicación');
          }
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: force ? 0 : 60000,
        }
      );
    });
  }, []);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setStatus('idle');
    setError(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  useEffect(() => {
    const cached = getStoredLocation();
    if (cached) {
      const timer = setTimeout(() => {
        setLocation(cached);
        setStatus('granted');
      }, 0);
      return () => clearTimeout(timer);
    }

    if (!autoRequest) return;
    const timer = setTimeout(() => {
      requestLocation();
    }, 0);
    return () => clearTimeout(timer);
  }, [autoRequest, requestLocation]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return;

    let cancelled = false;
    let permissionStatus: PermissionStatus | null = null;

    const handleChange = () => {
      if (!permissionStatus) return;
      setPermission(permissionStatus.state);
      // Unblocked from the browser's site settings: recover without a manual retry.
      if (permissionStatus.state === 'granted') requestLocation(true);
    };

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        if (cancelled) return;
        permissionStatus = result;
        setPermission(result.state);
        result.addEventListener('change', handleChange);
      })
      .catch(() => {
        // Some browsers reject the 'geolocation' descriptor — stay at null (unknown).
      });

    return () => {
      cancelled = true;
      permissionStatus?.removeEventListener('change', handleChange);
    };
  }, [requestLocation]);

  return {
    location,
    status,
    error,
    permission,
    requestLocation,
    clearLocation,
  };
}
