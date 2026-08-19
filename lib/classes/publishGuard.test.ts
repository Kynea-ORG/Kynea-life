import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { missingContactChannels, assertPublishAllowed } from './publishGuard';
import { parsePublishError } from './validation';

// ─── missingContactChannels (pure decision logic) ────────────────────────────

describe('missingContactChannels', () => {
  it('returns empty when whatsapp is required and present', () => {
    expect(missingContactChannels('whatsapp', { whatsapp: '+51999999999', instagram: null })).toEqual([]);
  });

  it('returns whatsapp when required and missing', () => {
    expect(missingContactChannels('whatsapp', { whatsapp: null, instagram: '@user' })).toEqual(['whatsapp']);
  });

  it('returns whatsapp when required and blank/whitespace-only', () => {
    expect(missingContactChannels('whatsapp', { whatsapp: '   ', instagram: null })).toEqual(['whatsapp']);
  });

  it('returns instagram when required and missing', () => {
    expect(missingContactChannels('instagram', { whatsapp: '+51999999999', instagram: null })).toEqual(['instagram']);
  });

  it('returns empty when instagram is required and present', () => {
    expect(missingContactChannels('instagram', { whatsapp: null, instagram: '@user' })).toEqual([]);
  });

  it('returns both channels when contactMode is both and both are missing', () => {
    expect(missingContactChannels('both', { whatsapp: null, instagram: null })).toEqual(['whatsapp', 'instagram']);
  });

  it('returns only the missing one when contactMode is both and one is present', () => {
    expect(missingContactChannels('both', { whatsapp: '+51999999999', instagram: null })).toEqual(['instagram']);
  });

  it('returns empty when contactMode is both and both are present', () => {
    expect(missingContactChannels('both', { whatsapp: '+51999999999', instagram: '@user' })).toEqual([]);
  });
});

// ─── assertPublishAllowed (DB-touching guard, mocked supabase) ──────────────

type MockProfile = {
  whatsapp: string | null;
  instagram: string | null;
  role?: string | null;
  academia_approved_at?: string | null;
} | null;

function mockSupabase(profile: MockProfile, error: { message: string } | null = null): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: profile, error }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe('assertPublishAllowed', () => {
  it('resolves without throwing when the required channel is present', async () => {
    const supabase = mockSupabase({ whatsapp: '+51999999999', instagram: null });
    await expect(assertPublishAllowed(supabase, 'user-1', 'whatsapp')).resolves.toBeUndefined();
  });

  it('throws a MISSING_CONTACT_CHANNEL publishError when the required channel is missing', async () => {
    const supabase = mockSupabase({ whatsapp: null, instagram: null });
    try {
      await assertPublishAllowed(supabase, 'user-1', 'whatsapp');
      expect.fail('expected assertPublishAllowed to throw');
    } catch (err) {
      const payload = parsePublishError(err);
      expect(payload?.code).toBe('MISSING_CONTACT_CHANNEL');
      expect(payload?.missing).toEqual(['whatsapp']);
    }
  });

  it('throws with both missing channels listed when contactMode is both and profile has neither', async () => {
    const supabase = mockSupabase(null);
    try {
      await assertPublishAllowed(supabase, 'user-1', 'both');
      expect.fail('expected assertPublishAllowed to throw');
    } catch (err) {
      const payload = parsePublishError(err);
      expect(payload?.code).toBe('MISSING_CONTACT_CHANNEL');
      expect(payload?.missing).toEqual(['whatsapp', 'instagram']);
    }
  });

  it('resolves without throwing when contactMode is both and both channels are present', async () => {
    const supabase = mockSupabase({ whatsapp: '+51999999999', instagram: '@user' });
    await expect(assertPublishAllowed(supabase, 'user-1', 'both')).resolves.toBeUndefined();
  });

  it('throws ACADEMIA_NOT_APPROVED when role is academia and academia_approved_at is null, even if contact channels are complete', async () => {
    const supabase = mockSupabase({
      whatsapp: '+51999999999', instagram: '@user', role: 'academia', academia_approved_at: null,
    });
    try {
      await assertPublishAllowed(supabase, 'user-1', 'both');
      expect.fail('expected assertPublishAllowed to throw');
    } catch (err) {
      const payload = parsePublishError(err);
      expect(payload?.code).toBe('ACADEMIA_NOT_APPROVED');
    }
  });

  it('resolves without throwing when role is academia and academia_approved_at is set', async () => {
    const supabase = mockSupabase({
      whatsapp: '+51999999999', instagram: '@user', role: 'academia', academia_approved_at: '2026-08-19T00:00:00Z',
    });
    await expect(assertPublishAllowed(supabase, 'user-1', 'both')).resolves.toBeUndefined();
  });

  it('throws a plain (non-publishError) Error when the profile lookup itself fails, without academia-specific copy', async () => {
    const supabase = mockSupabase(null, { message: 'network error' });
    try {
      await assertPublishAllowed(supabase, 'user-1', 'whatsapp');
      expect.fail('expected assertPublishAllowed to throw');
    } catch (err) {
      expect(parsePublishError(err)).toBeNull();
      expect(err).toBeInstanceOf(Error);
    }
  });
});
