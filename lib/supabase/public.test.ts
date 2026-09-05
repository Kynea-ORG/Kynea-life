import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getPublicClient, setPublicClientForTesting } from './public';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('getPublicClient', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    setPublicClientForTesting(null);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    setPublicClientForTesting(null);
  });

  it('throws an error when SUPABASE URL or ANON KEY is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => getPublicClient()).toThrow('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  });

  it('returns the same singleton client instance across calls when env is present', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    const client1 = getPublicClient();
    const client2 = getPublicClient();

    expect(client1).toBe(client2);
  });

  it('allows overriding via setPublicClientForTesting', () => {
    const mock = {} as SupabaseClient;
    setPublicClientForTesting(mock);
    expect(getPublicClient()).toBe(mock);
  });
});
