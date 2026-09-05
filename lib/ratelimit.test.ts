import { describe, it, expect, vi } from 'vitest';
import { checkRateLimit } from './ratelimit';

describe('checkRateLimit', () => {
  it('returns success: true when limiter is null (fail-open when credentials are not configured)', async () => {
    const res = await checkRateLimit(null, 'test-id');
    expect(res.success).toBe(true);
  });

  it('handles errors from Upstash Redis gracefully (fail-open policy)', async () => {
    const mockLimiter = {
      limit: vi.fn().mockRejectedValue(new Error('Connection timeout')),
    } as unknown as Parameters<typeof checkRateLimit>[0];

    const res = await checkRateLimit(mockLimiter, 'test-id');
    expect(res.success).toBe(true);
  });

  it('returns result correctly when limiter succeeds', async () => {
    const mockLimiter = {
      limit: vi.fn().mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: 123456789,
      }),
    } as unknown as Parameters<typeof checkRateLimit>[0];

    const res = await checkRateLimit(mockLimiter, 'test-id');
    expect(res.success).toBe(false);
    expect(res.remaining).toBe(0);
  });
});
