import { describe, it, expect, vi } from 'vitest';
import { buildClassColumns, venueNeedsUpdate, findOrCreateVenue } from './helpers';
import type { SupabaseClient } from '@supabase/supabase-js';

// Approval tests for buildClassColumns' contact_mode handling.
// PR1 (class-publish-wizard) widens the contact_mode union from
// 'whatsapp' | 'instagram' | 'web' to 'whatsapp' | 'instagram' | 'both'.
// This is a type-only change (the underlying cast was already a raw
// FormData passthrough), so these tests capture the RUNTIME behavior
// the migration + type edits must preserve/enable.

function fdWith(contactMode: string | null): FormData {
  const fd = new FormData();
  fd.set('type', 'clase');
  fd.set('title', 'Salsa para principiantes');
  fd.set('priceType', 'Gratis');
  fd.set('price', '0');
  fd.set('modality', 'Presencial');
  fd.set('status', 'draft');
  if (contactMode !== null) fd.set('contactMode', contactMode);
  return fd;
}

describe('buildClassColumns — contact_mode', () => {
  it('defaults to "whatsapp" when contactMode is absent from FormData', () => {
    const cols = buildClassColumns(fdWith(null), { levelId: null, venueId: null });
    expect(cols.contact_mode).toBe('whatsapp');
  });

  it('passes through "instagram" unchanged', () => {
    const cols = buildClassColumns(fdWith('instagram'), { levelId: null, venueId: null });
    expect(cols.contact_mode).toBe('instagram');
  });

  it('passes through the new "both" value (replaces the removed "web" option)', () => {
    const cols = buildClassColumns(fdWith('both'), { levelId: null, venueId: null });
    expect(cols.contact_mode).toBe('both');
  });
});

// ─── venueNeedsUpdate ───────────────────────────────────────────────────────
// Pure function, no mocks. Determines whether updateClassFromForm must
// re-run findOrCreateVenue (dedup lookup / insert) or keep the existing
// venue_id untouched (orphan-on-edit fix).

describe('venueNeedsUpdate', () => {
  it('returns true when current venue is null (no venue linked yet)', () => {
    expect(venueNeedsUpdate(null, { placeId: 'place-1', address: 'Av. Test 123', name: '', city: 'Lima', district: 'Miraflores' })).toBe(true);
  });

  it('returns true when both place_id/placeId are non-null and differ', () => {
    expect(venueNeedsUpdate(
      { place_id: 'place-1', address: 'Av. Test 123', name: '', city: 'Lima', district: 'Miraflores' },
      { placeId: 'place-2', address: 'Av. Test 123', name: '', city: 'Lima', district: 'Miraflores' }
    )).toBe(true);
  });

  it('returns false when both place_id/placeId are non-null and equal', () => {
    expect(venueNeedsUpdate(
      { place_id: 'place-1', address: 'Av. Test 123', name: '', city: 'Lima', district: 'Miraflores' },
      { placeId: 'place-1', address: 'Av. Test 123', name: '', city: 'Lima', district: 'Miraflores' }
    )).toBe(false);
  });

  it('returns true when incoming placeId is null and address differs from current', () => {
    expect(venueNeedsUpdate(
      { place_id: null, address: 'Av. Old 111', name: '', city: 'Lima', district: 'Miraflores' },
      { placeId: null, address: 'Av. New 222', name: '', city: 'Lima', district: 'Miraflores' }
    )).toBe(true);
  });

  it('returns false when incoming placeId is null and address equals current', () => {
    expect(venueNeedsUpdate(
      { place_id: null, address: 'Av. Test 123', name: '', city: 'Lima', district: 'Miraflores' },
      { placeId: null, address: 'Av. Test 123', name: '', city: 'Lima', district: 'Miraflores' }
    )).toBe(false);
  });

  it('returns true when only the name differs (place_id and address unchanged)', () => {
    expect(venueNeedsUpdate(
      { place_id: 'place-1', address: 'Av. Test 123', name: 'Old Studio', city: 'Lima', district: 'Miraflores' },
      { placeId: 'place-1', address: 'Av. Test 123', name: 'New Studio', city: 'Lima', district: 'Miraflores' }
    )).toBe(true);
  });

  // Regression: findOrCreateVenue is the only place that writes city/district
  // (extracted from Google's addressComponents) — if this comparison ignores
  // them, editing only the district on an unchanged address silently drops
  // the new value, since findOrCreateVenue never gets called.
  it('returns true when only city or district differs (place_id/address/name unchanged)', () => {
    expect(venueNeedsUpdate(
      { place_id: 'place-1', address: 'Av. Test 123', name: '', city: 'Lima', district: 'Miraflores' },
      { placeId: 'place-1', address: 'Av. Test 123', name: '', city: 'Lima', district: 'Barranco' }
    )).toBe(true);
    expect(venueNeedsUpdate(
      { place_id: 'place-1', address: 'Av. Test 123', name: '', city: 'Lima', district: 'Miraflores' },
      { placeId: 'place-1', address: 'Av. Test 123', name: '', city: 'Callao', district: 'Miraflores' }
    )).toBe(true);
  });
});

// ─── findOrCreateVenue ──────────────────────────────────────────────────────
// Local chainable Supabase mock (no reusable helper exists yet in this repo's
// test suite). Mirrors the query shapes findOrCreateVenue is expected to use:
//   .from('venues').select('id').eq('owner_id', x).eq('place_id', y).maybeSingle()
//   .from('venues').insert({...}).select('id').single()

type MockCall = { table: string; op: 'select' | 'insert' | 'update'; args: unknown[] };

function buildSupabaseMock(opts: {
  maybeSingleResult?: { data: { id: string } | null; error: unknown };
  singleResult?: { data: { id: string } | null; error: unknown };
  updateResult?: { error: unknown };
}) {
  const calls: MockCall[] = [];
  const insertMock = vi.fn();
  const updateMock = vi.fn();

  const from = vi.fn((table: string) => {
    const chain = {
      select: vi.fn((...selectArgs: unknown[]) => {
        calls.push({ table, op: 'select', args: selectArgs });
        return {
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () =>
                opts.maybeSingleResult ?? { data: null, error: null }
              ),
            })),
          })),
          single: vi.fn(async () => opts.singleResult ?? { data: null, error: null }),
        };
      }),
      insert: vi.fn((...insertArgs: unknown[]) => {
        insertMock(...insertArgs);
        calls.push({ table, op: 'insert', args: insertArgs });
        return {
          select: vi.fn(() => ({
            single: vi.fn(async () => opts.singleResult ?? { data: null, error: null }),
          })),
        };
      }),
      update: vi.fn((...updateArgs: unknown[]) => {
        updateMock(...updateArgs);
        calls.push({ table, op: 'update', args: updateArgs });
        return {
          eq: vi.fn(async () => opts.updateResult ?? { error: null }),
        };
      }),
    };
    return chain;
  });

  return { from, calls, insertMock, updateMock } as unknown as SupabaseClient & {
    calls: MockCall[];
    insertMock: typeof insertMock;
    updateMock: typeof updateMock;
  };
}

describe('findOrCreateVenue', () => {
  const baseOpts = {
    name: 'Estudio Test',
    address: 'Av. Test 123',
    reference: 'Frente al parque',
    city: 'Lima',
    district: 'Miraflores',
  };

  it('returns the existing venue id when placeId matches an owner-scoped row (no insert, but refreshes name/reference)', async () => {
    const supabase = buildSupabaseMock({
      maybeSingleResult: { data: { id: 'venue-existing' }, error: null },
    });

    const id = await findOrCreateVenue(supabase, 'owner-1', {
      ...baseOpts, placeId: 'place-1', lat: -12.1, lng: -77.02,
    });

    expect(id).toBe('venue-existing');
    expect(supabase.insertMock).not.toHaveBeenCalled();
    expect(supabase.updateMock).toHaveBeenCalledTimes(1);
    expect(supabase.updateMock.mock.calls[0][0]).toMatchObject({ name: 'Estudio Test', reference: 'Frente al parque' });
  });

  it('inserts a new venue (with place_id/lat/lng) when placeId is provided but no match is found', async () => {
    const supabase = buildSupabaseMock({
      maybeSingleResult: { data: null, error: null },
      singleResult: { data: { id: 'venue-new' }, error: null },
    });

    const id = await findOrCreateVenue(supabase, 'owner-1', {
      ...baseOpts, placeId: 'place-2', lat: -12.2, lng: -77.03,
    });

    expect(id).toBe('venue-new');
    expect(supabase.insertMock).toHaveBeenCalledTimes(1);
    const insertedRow = supabase.insertMock.mock.calls[0][0];
    expect(insertedRow).toMatchObject({ place_id: 'place-2', lat: -12.2, lng: -77.03 });
  });

  it('always inserts (no lookup short-circuit) when placeId is null', async () => {
    const supabase = buildSupabaseMock({
      singleResult: { data: { id: 'venue-manual' }, error: null },
    });

    const id = await findOrCreateVenue(supabase, 'owner-1', {
      ...baseOpts, placeId: null, lat: null, lng: null,
    });

    expect(id).toBe('venue-manual');
    expect(supabase.insertMock).toHaveBeenCalledTimes(1);
  });
});
