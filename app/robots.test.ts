import { describe, it, expect, afterEach } from 'vitest';
import robots from './robots';

describe('robots()', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('allows crawling and includes sitemap in Vercel production', () => {
    process.env.VERCEL_ENV = 'production';
    process.env.VERCEL_TARGET_ENV = 'production';
    process.env.NEXT_PUBLIC_APP_ENV = 'production';

    const result = robots();
    expect(result.sitemap).toBe('https://www.kynea.dance/sitemap.xml');
    expect(result.rules).toEqual(
      expect.objectContaining({
        allow: '/',
      })
    );
  });

  it('disallows all crawling and omits sitemap in staging/sandbox/preview', () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_TARGET_ENV = 'staging';
    process.env.NEXT_PUBLIC_APP_ENV = 'staging';

    const result = robots();
    expect(result.sitemap).toBeUndefined();
    expect(result.rules).toEqual({
      userAgent: '*',
      disallow: '/',
    });
  });
});
