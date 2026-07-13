import { describe, it, expect } from 'vitest';
import { buildClassColumns } from './helpers';

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
