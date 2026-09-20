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
 */
export function useUserLocation({ autoRequest = true }: { autoRequest?: boolean } = {}) {
  // Initialize to null/'idle' so initial client render matches SSR HTML (avoids hydration mismatch)
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<UserLocationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
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

  return {
    location,
    status,
    error,
    requestLocation,
    clearLocation,
  };
}
