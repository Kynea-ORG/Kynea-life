import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { missingContactChannels, assertContactChannel } from './publishGuard';
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

// ─── assertContactChannel (DB-touching guard, mocked supabase) ──────────────

function mockSupabase(profile: { whatsapp: string | null; instagram: string | null } | null): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: profile, error: null }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe('assertContactChannel', () => {
  it('resolves without throwing when the required channel is present', async () => {
    const supabase = mockSupabase({ whatsapp: '+51999999999', instagram: null });
    await expect(assertContactChannel(supabase, 'user-1', 'whatsapp')).resolves.toBeUndefined();
  });

  it('throws a MISSING_CONTACT_CHANNEL publishError when the required channel is missing', async () => {
    const supabase = mockSupabase({ whatsapp: null, instagram: null });
    try {
      await assertContactChannel(supabase, 'user-1', 'whatsapp');
      expect.fail('expected assertContactChannel to throw');
    } catch (err) {
      const payload = parsePublishError(err);
      expect(payload?.code).toBe('MISSING_CONTACT_CHANNEL');
      expect(payload?.missing).toEqual(['whatsapp']);
    }
  });

  it('throws with both missing channels listed when contactMode is both and profile has neither', async () => {
    const supabase = mockSupabase(null);
    try {
      await assertContactChannel(supabase, 'user-1', 'both');
      expect.fail('expected assertContactChannel to throw');
    } catch (err) {
      const payload = parsePublishError(err);
      expect(payload?.code).toBe('MISSING_CONTACT_CHANNEL');
      expect(payload?.missing).toEqual(['whatsapp', 'instagram']);
    }
  });

  it('resolves without throwing when contactMode is both and both channels are present', async () => {
    const supabase = mockSupabase({ whatsapp: '+51999999999', instagram: '@user' });
    await expect(assertContactChannel(supabase, 'user-1', 'both')).resolves.toBeUndefined();
  });
});
