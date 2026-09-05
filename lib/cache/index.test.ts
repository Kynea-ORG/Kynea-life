import { describe, it, expect, vi } from 'vitest';
import { safeCache, safeRevalidateTag } from './index';

describe('safeCache', () => {
  it('executes callback directly in test environment without throwing', async () => {
    const fn = vi.fn(async (x: number) => x * 2);
    const cached = safeCache(fn, ['test-key'], { revalidate: 60, tags: ['test'] });

    const result = await cached(21);
    expect(result).toBe(42);
    expect(fn).toHaveBeenCalledWith(21);
  });
});

describe('safeRevalidateTag', () => {
  it('does not throw when called outside Next.js request context', () => {
    expect(() => {
      safeRevalidateTag('classes', 'max');
    }).not.toThrow();
  });
});
