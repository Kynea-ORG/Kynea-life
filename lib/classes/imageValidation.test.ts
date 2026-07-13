import { describe, it, expect } from 'vitest';
import { validateImageFile, MAX_IMAGE_BYTES, ALLOWED_IMAGE_MIME } from './imageValidation';

// ─── Magic-byte fixtures ────────────────────────────────────────────────────

const PNG_HEAD = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0]);
const JPEG_HEAD = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const WEBP_HEAD = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, // RIFF
  0, 0, 0, 0, // file size (unused by the check)
  0x57, 0x45, 0x42, 0x50, // WEBP
  0, 0, 0, 0,
]);
const PDF_HEAD = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0, 0, 0, 0, 0, 0, 0, 0]);
const GIF_HEAD = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

describe('constants', () => {
  it('MAX_IMAGE_BYTES is exactly 5MB', () => {
    expect(MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024);
  });

  it('ALLOWED_IMAGE_MIME contains exactly png/jpeg/webp', () => {
    expect(ALLOWED_IMAGE_MIME).toEqual(['image/png', 'image/jpeg', 'image/webp']);
  });
});

describe('validateImageFile — size', () => {
  it('rejects a file over 5MB even with valid MIME + magic bytes', () => {
    const result = validateImageFile({ type: 'image/png', size: MAX_IMAGE_BYTES + 1, head: PNG_HEAD });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatchObject({ field: 'coverImage' });
    expect(result.errors[0].message).toMatch(/5MB/);
  });

  it('accepts a file exactly at the 5MB boundary', () => {
    const result = validateImageFile({ type: 'image/png', size: MAX_IMAGE_BYTES, head: PNG_HEAD });
    expect(result.ok).toBe(true);
  });
});

describe('validateImageFile — MIME allow-list', () => {
  it('rejects a disallowed MIME type (application/pdf) regardless of size', () => {
    const result = validateImageFile({ type: 'application/pdf', size: 1000, head: PDF_HEAD });
    expect(result.ok).toBe(false);
    expect(result.errors[0].field).toBe('coverImage');
  });

  it('rejects a disallowed MIME type (image/gif)', () => {
    const result = validateImageFile({ type: 'image/gif', size: 1000, head: GIF_HEAD });
    expect(result.ok).toBe(false);
  });
});

describe('validateImageFile — magic-byte signature (spoofed Content-Type defense)', () => {
  it('rejects when the declared MIME is image/png but the bytes are not a PNG signature', () => {
    const result = validateImageFile({ type: 'image/png', size: 1000, head: PDF_HEAD });
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toMatch(/Formato/);
  });

  it('rejects when the declared MIME is image/jpeg but bytes are a PNG signature', () => {
    const result = validateImageFile({ type: 'image/jpeg', size: 1000, head: PNG_HEAD });
    expect(result.ok).toBe(false);
  });

  it('rejects a truncated/empty head buffer', () => {
    const result = validateImageFile({ type: 'image/png', size: 1000, head: new Uint8Array(0) });
    expect(result.ok).toBe(false);
  });
});

describe('validateImageFile — happy paths', () => {
  it('accepts a valid PNG', () => {
    const result = validateImageFile({ type: 'image/png', size: 1000, head: PNG_HEAD });
    expect(result).toEqual({ ok: true, errors: [] });
  });

  it('accepts a valid JPEG', () => {
    const result = validateImageFile({ type: 'image/jpeg', size: 1000, head: JPEG_HEAD });
    expect(result).toEqual({ ok: true, errors: [] });
  });

  it('accepts a valid WEBP', () => {
    const result = validateImageFile({ type: 'image/webp', size: 1000, head: WEBP_HEAD });
    expect(result).toEqual({ ok: true, errors: [] });
  });
});
