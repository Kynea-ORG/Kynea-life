import { describe, it, expect } from 'vitest';
import { getProfileUrl, safeRedirectPath } from './utils';

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
