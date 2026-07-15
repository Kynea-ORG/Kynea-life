import { describe, it, expect } from 'vitest';
import { roleMismatchNotice } from './redirectByRole';

// Pure function, no mocks. Mirrors the style of `venueNeedsUpdate` tests in
// lib/classes/helpers.test.ts. Ported from the inline ternary in
// app/auth/callback/route.ts (line 66) so both the OAuth and OTP paths share
// identical comparison semantics.

describe('roleMismatchNotice', () => {
  it('returns null when the incoming role matches the existing profile role', () => {
    expect(roleMismatchNotice('profesor', 'profesor')).toBe(null);
  });

  it('returns "cuenta_existente" when the incoming role differs from the existing profile role', () => {
    expect(roleMismatchNotice('profesor', 'alumno')).toBe('cuenta_existente');
  });

  it('returns null when there is no incoming role', () => {
    expect(roleMismatchNotice(null, 'alumno')).toBe(null);
  });

  it('returns null when there is no existing profile role', () => {
    expect(roleMismatchNotice('profesor', null)).toBe(null);
  });
});
