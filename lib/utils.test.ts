import { describe, it, expect } from 'vitest';
import {
  getProfileUrl,
  safeRedirectPath,
  calculateDistanceKm,
  formatDistance,
  safeJsonLd,
  extractSocialHandle,
  buildInstagramUrl,
  buildTikTokUrl,
  formatSocialHandle,
} from './utils';

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

describe('safeJsonLd', () => {
  it('escapes < characters to \\u003c to prevent script tag injection', () => {
    const malicious = { name: '</script><script>alert(1)</script>' };
    const serialized = safeJsonLd(malicious);
    expect(serialized).not.toContain('<');
    expect(serialized).toContain('\\u003c/script>\\u003cscript>alert(1)\\u003c/script>');
    expect(JSON.parse(serialized)).toEqual(malicious);
  });

  it('correctly serializes standard JSON objects without corruption', () => {
    const standard = { title: 'Clase de Salsa', price: 50, active: true };
    expect(JSON.parse(safeJsonLd(standard))).toEqual(standard);
  });
});

describe('extractSocialHandle', () => {
  it('returns empty string for falsy or whitespace values', () => {
    expect(extractSocialHandle('')).toBe('');
    expect(extractSocialHandle('   ')).toBe('');
    expect(extractSocialHandle(null)).toBe('');
    expect(extractSocialHandle(undefined)).toBe('');
  });

  it('preserves clean handles without modification', () => {
    expect(extractSocialHandle('dario_boada')).toBe('dario_boada');
    expect(extractSocialHandle('lichynu')).toBe('lichynu');
  });

  it('strips leading @ characters', () => {
    expect(extractSocialHandle('@dario_boada')).toBe('dario_boada');
    expect(extractSocialHandle('@@dario_boada')).toBe('dario_boada');
  });

  it('trims leading and trailing spaces', () => {
    expect(extractSocialHandle('  lichynu_dance  ')).toBe('lichynu_dance');
  });

  it('extracts handle from full Instagram URLs with query params (Darío Boada case)', () => {
    const raw = 'https://www.instagram.com/dario_boada?stkn=MWdqN2RvMDcwc2RzZA==';
    expect(extractSocialHandle(raw, 'instagram')).toBe('dario_boada');
    expect(extractSocialHandle(raw)).toBe('dario_boada');
  });

  it('extracts handle from full Instagram URLs with trailing slashes and hashes', () => {
    expect(extractSocialHandle('https://instagram.com/dario_boada/')).toBe('dario_boada');
    expect(extractSocialHandle('http://instagram.com/dario_boada#section')).toBe('dario_boada');
    expect(extractSocialHandle('instagram.com/dario_boada')).toBe('dario_boada');
  });

  it('extracts handle from full TikTok URLs with @ and query params (Darío Boada case)', () => {
    const raw = 'https://www.tiktok.com/@dario_boada?_r=1&_t=ZS-9A9k9twWGFm';
    expect(extractSocialHandle(raw, 'tiktok')).toBe('dario_boada');
    expect(extractSocialHandle(raw)).toBe('dario_boada');
  });

  it('extracts handle from various TikTok URLs', () => {
    expect(extractSocialHandle('https://tiktok.com/@dario_boada')).toBe('dario_boada');
    expect(extractSocialHandle('https://tiktok.com/dario_boada/')).toBe('dario_boada');
    expect(extractSocialHandle('tiktok.com/@dario_boada')).toBe('dario_boada');
    expect(extractSocialHandle('https://vm.tiktok.com/@dario_boada')).toBe('dario_boada');
  });
});

describe('buildInstagramUrl', () => {
  it('returns empty string for invalid or empty inputs', () => {
    expect(buildInstagramUrl('')).toBe('');
    expect(buildInstagramUrl(null)).toBe('');
    expect(buildInstagramUrl(undefined)).toBe('');
  });

  it('builds clean URL from plain handle', () => {
    expect(buildInstagramUrl('dario_boada')).toBe('https://instagram.com/dario_boada');
  });

  it('builds clean URL from handle with @', () => {
    expect(buildInstagramUrl('@dario_boada')).toBe('https://instagram.com/dario_boada');
  });

  it('normalizes full URL with query parameters into clean profile URL', () => {
    const raw = 'https://www.instagram.com/dario_boada?stkn=MWdqN2RvMDcwc2RzZA==';
    expect(buildInstagramUrl(raw)).toBe('https://instagram.com/dario_boada');
  });

  it('handles accidental duplicate prefixes gracefully', () => {
    const broken = 'https://instagram.com/https://www.instagram.com/dario_boada?stkn=123';
    expect(buildInstagramUrl(broken)).toBe('https://instagram.com/dario_boada');
  });
});

describe('buildTikTokUrl', () => {
  it('returns empty string for invalid or empty inputs', () => {
    expect(buildTikTokUrl('')).toBe('');
    expect(buildTikTokUrl(null)).toBe('');
    expect(buildTikTokUrl(undefined)).toBe('');
  });

  it('builds clean URL with @ prefix from plain handle', () => {
    expect(buildTikTokUrl('dario_boada')).toBe('https://tiktok.com/@dario_boada');
  });

  it('builds clean URL from handle already having @', () => {
    expect(buildTikTokUrl('@dario_boada')).toBe('https://tiktok.com/@dario_boada');
  });

  it('normalizes full TikTok URL with parameters into clean profile URL', () => {
    const raw = 'https://www.tiktok.com/@dario_boada?_r=1&_t=ZS-9A9k9twWGFm';
    expect(buildTikTokUrl(raw)).toBe('https://tiktok.com/@dario_boada');
  });

  it('handles accidental duplicate prefixes gracefully', () => {
    const broken = 'https://tiktok.com/@https://www.tiktok.com/@dario_boada?_r=1';
    expect(buildTikTokUrl(broken)).toBe('https://tiktok.com/@dario_boada');
  });
});

describe('formatSocialHandle', () => {
  it('returns empty string for falsy input', () => {
    expect(formatSocialHandle('')).toBe('');
    expect(formatSocialHandle(null)).toBe('');
  });

  it('formats plain handles with @', () => {
    expect(formatSocialHandle('dario_boada')).toBe('@dario_boada');
    expect(formatSocialHandle('@dario_boada')).toBe('@dario_boada');
  });

  it('formats full URLs into clean @handle', () => {
    expect(formatSocialHandle('https://www.instagram.com/dario_boada?stkn=MWdqN2RvMDcwc2RzZA==', 'instagram')).toBe('@dario_boada');
    expect(formatSocialHandle('https://www.tiktok.com/@dario_boada?_r=1', 'tiktok')).toBe('@dario_boada');
  });
});
