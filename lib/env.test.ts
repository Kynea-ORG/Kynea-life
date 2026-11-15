import { describe, it, expect } from 'vitest';
import { isProductionDeployment } from './env';

describe('isProductionDeployment', () => {
  it('returns true for Vercel production deployment', () => {
    expect(
      isProductionDeployment({
        VERCEL_ENV: 'production',
        VERCEL_TARGET_ENV: 'production',
        NEXT_PUBLIC_APP_ENV: 'production',
      })
    ).toBe(true);
  });

  it('returns true on Vercel production even when NEXT_PUBLIC_APP_ENV is omitted', () => {
    expect(isProductionDeployment({ VERCEL_ENV: 'production' })).toBe(true);
  });

  it('returns false for Vercel Custom Environment staging', () => {
    expect(
      isProductionDeployment({
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'staging',
        NEXT_PUBLIC_APP_ENV: 'staging',
      })
    ).toBe(false);
  });

  it('returns false for Vercel Custom Environment sandbox', () => {
    expect(
      isProductionDeployment({
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'sandbox',
        NEXT_PUBLIC_APP_ENV: 'sandbox',
      })
    ).toBe(false);
  });

  it('returns false if NEXT_PUBLIC_APP_ENV is production by mistake on a Vercel preview/staging env', () => {
    expect(
      isProductionDeployment({
        VERCEL_ENV: 'preview',
        VERCEL_TARGET_ENV: 'staging',
        NEXT_PUBLIC_APP_ENV: 'production',
      })
    ).toBe(false);
  });

  it('returns false if NEXT_PUBLIC_APP_ENV is non-production even when VERCEL_ENV is production', () => {
    expect(
      isProductionDeployment({
        VERCEL_ENV: 'production',
        NEXT_PUBLIC_APP_ENV: 'staging',
      })
    ).toBe(false);
  });

  it('returns false in local development and CI when VERCEL_ENV is unset', () => {
    expect(isProductionDeployment({ NEXT_PUBLIC_APP_ENV: 'development' })).toBe(false);
    expect(isProductionDeployment({})).toBe(false);
  });

  it('returns true outside Vercel only when NEXT_PUBLIC_APP_ENV is explicitly production', () => {
    expect(isProductionDeployment({ NEXT_PUBLIC_APP_ENV: 'production' })).toBe(true);
  });
});
