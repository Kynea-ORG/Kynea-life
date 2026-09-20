import { describe, it, expect } from 'vitest';
import { getProfileUrl, safeRedirectPath, calculateDistanceKm, formatDistance } from './utils';

describe('getProfileUrl', () => {
  it('returns /academias/{slug} when type is academia', () => {
    expect(getProfileUrl({ type: 'academia', slug: 'd1-asociacion' })).toBe('/academias/d1-asociacion');
  });

  it('returns /academias/{slug} when role is academia', () => {
    expect(getProfileUrl({ role: 'academia', slug: 'freestyle-dance' })).toBe('/academias/freestyle-dance');
  });

  it('returns /profesores/{slug} when type is profesor', () => {
    expect(getProfileUrl({ type: 'profesor', slug: 'carlos-mendoza' })).toBe('/profesores/carlos-mendoza');
  });

  it('returns /profesores/{slug} when role is profesor', () => {
    expect(getProfileUrl({ role: 'profesor', slug: 'maria-lopez' })).toBe('/profesores/maria-lopez');
  });

  it('defaults to /profesores/{slug} when neither type nor role is academia', () => {
    expect(getProfileUrl({ slug: 'instructor-xyz' })).toBe('/profesores/instructor-xyz');
  });
});

describe('safeRedirectPath', () => {
  it('allows relative paths starting with single slash', () => {
    expect(safeRedirectPath('/dashboard')).toBe('/dashboard');
    expect(safeRedirectPath('/clases?style=salsa')).toBe('/clases?style=salsa');
  });

  it('blocks open redirects or invalid paths', () => {
    expect(safeRedirectPath('//evil.com')).toBeNull();
    expect(safeRedirectPath('https://evil.com')).toBeNull();
    expect(safeRedirectPath('')).toBeNull();
    expect(safeRedirectPath(null)).toBeNull();
    expect(safeRedirectPath(undefined)).toBeNull();
  });
});

describe('calculateDistanceKm', () => {
  it('returns 0 for identical coordinates', () => {
    expect(calculateDistanceKm(-12.1218, -77.0298, -12.1218, -77.0298)).toBe(0);
  });

  it('calculates approximately correct distance between Miraflores and Barranco (~2.5km)', () => {
    // Parque Kennedy (-12.1218, -77.0298) to Puente de los Suspiros (-12.1488, -77.0217)
    const dist = calculateDistanceKm(-12.1218, -77.0298, -12.1488, -77.0217);
    expect(dist).toBeGreaterThan(2.5);
    expect(dist).toBeLessThan(3.5);
  });

  it('is symmetric', () => {
    const d1 = calculateDistanceKm(-12.1218, -77.0298, -12.0463, -77.0427);
    const d2 = calculateDistanceKm(-12.0463, -77.0427, -12.1218, -77.0298);
    expect(Math.abs(d1 - d2)).toBeLessThan(0.0001);
  });
});

describe('formatDistance', () => {
  it('formats distances under 1 km as meters', () => {
    expect(formatDistance(0.35)).toBe('350 m');
    expect(formatDistance(0.05)).toBe('50 m');
    expect(formatDistance(0.999)).toBe('999 m');
  });

  it('formats distances between 1 km and 9.9 km with one decimal', () => {
    expect(formatDistance(1.23)).toBe('1.2 km');
    expect(formatDistance(2.0)).toBe('2.0 km');
    expect(formatDistance(9.87)).toBe('9.9 km');
  });

  it('formats distances 10 km and above as whole numbers', () => {
    expect(formatDistance(12.4)).toBe('12 km');
    expect(formatDistance(25.8)).toBe('26 km');
  });
});
