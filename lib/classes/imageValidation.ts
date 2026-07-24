import type { ValidationResult } from './validation';

// ─── Constants ──────────────────────────────────────────────────────────────
// Server-safe, pure, no DB, no 'use server' — byte-level rules for the class
// cover image. Reused by imageActions.ts's server-side upload path. Separate
// from validation.ts's validateForPublish family: this runs at upload time
// (even for drafts), not gated on status === 'published'.

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number];

// ─── Magic-byte signatures ──────────────────────────────────────────────────
// Defends against a renamed/spoofed extension or a lying Content-Type header —
// the declared MIME alone is never trusted, the actual leading bytes are.

function matchesPng(head: Uint8Array): boolean {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return sig.every((byte, i) => head[i] === byte);
}

function matchesJpeg(head: Uint8Array): boolean {
  return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
}

function matchesWebp(head: Uint8Array): boolean {
  const isRiff = head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46;
  const isWebp = head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;
  return isRiff && isWebp;
}

const SIGNATURE_CHECK: Record<AllowedImageMime, (head: Uint8Array) => boolean> = {
  'image/png': matchesPng,
  'image/jpeg': matchesJpeg,
  'image/webp': matchesWebp,
};

function isAllowedMime(type: string): type is AllowedImageMime {
  return (ALLOWED_IMAGE_MIME as readonly string[]).includes(type);
}

// ─── Pixel dimensions ───────────────────────────────────────────────────────
// Same "never trust the client" reasoning as the magic-byte check above: the
// browser-side getImageDimensions() check (lib/imageDimensions.ts) is a UX
// hint only, easy to bypass (disabled JS, direct API call) — this re-derives
// real pixel dimensions from the file bytes without any image library, same
// hand-rolled-parser style as the signature checks.

export const MIN_IMAGE_DIMENSION = 400;

function pngDimensions(buf: Uint8Array): { width: number; height: number } | null {
  if (buf.length < 24) return null;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function jpegDimensions(buf: Uint8Array): { width: number; height: number } | null {
  let offset = 2; // skip the SOI marker (0xFFD8)
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) { offset++; continue; }
    const marker = buf[offset + 1];
    // Markers with no payload segment to skip over.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) { offset += 2; continue; }
    const segmentLength = (buf[offset + 2] << 8) | buf[offset + 3];
    // SOF0-SOF15 (frame markers) except the DHT/JPG/DAC reserved codes carry
    // the dimensions; every other marker just gets skipped by its length.
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      return { height: (buf[offset + 5] << 8) | buf[offset + 6], width: (buf[offset + 7] << 8) | buf[offset + 8] };
    }
    offset += 2 + segmentLength;
  }
  return null;
}

function webpDimensions(buf: Uint8Array): { width: number; height: number } | null {
  if (buf.length < 30) return null;
  const fourCC = (o: number) => String.fromCharCode(buf[o], buf[o + 1], buf[o + 2], buf[o + 3]);
  if (fourCC(12) === 'VP8X') {
    return {
      width:  (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1,
      height: (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1,
    };
  }
  if (fourCC(12) === 'VP8 ') {
    // 3-byte frame tag + 3-byte start code (0x9d 0x01 0x2a) precede the dims.
    const o = 20 + 6;
    return { width: ((buf[o + 1] << 8) | buf[o]) & 0x3fff, height: ((buf[o + 3] << 8) | buf[o + 2]) & 0x3fff };
  }
  if (fourCC(12) === 'VP8L') {
    const o = 20 + 1; // 1-byte 0x2f signature before the packed dims
    const b0 = buf[o], b1 = buf[o + 1], b2 = buf[o + 2], b3 = buf[o + 3];
    return {
      width:  1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    };
  }
  return null;
}

const DIMENSIONS_BY_MIME: Record<AllowedImageMime, (buf: Uint8Array) => { width: number; height: number } | null> = {
  'image/png': pngDimensions,
  'image/jpeg': jpegDimensions,
  'image/webp': webpDimensions,
};

// ─── Validator ──────────────────────────────────────────────────────────────

export interface ImageFileInput {
  type: string;
  size: number;
  head: Uint8Array;
  full?: Uint8Array;
}

export function validateImageFile(input: ImageFileInput): ValidationResult {
  if (input.size > MAX_IMAGE_BYTES) {
    return { ok: false, errors: [{ field: 'coverImage', message: 'La imagen supera 5MB.' }] };
  }

  if (!isAllowedMime(input.type)) {
    return { ok: false, errors: [{ field: 'coverImage', message: 'Formato no permitido. Usa PNG, JPG o WEBP.' }] };
  }

  const matchesSignature = SIGNATURE_CHECK[input.type](input.head);
  if (!matchesSignature) {
    return { ok: false, errors: [{ field: 'coverImage', message: 'Formato no permitido. Usa PNG, JPG o WEBP.' }] };
  }

  if (input.full) {
    const dims = DIMENSIONS_BY_MIME[input.type](input.full);
    // Unparseable dimensions (truncated/malformed file) fail closed here —
    // the signature check above already confirmed it's a real image of this
    // format, so a parse failure means the file is corrupt, not that this
    // check should be skipped.
    if (!dims || Math.min(dims.width, dims.height) < MIN_IMAGE_DIMENSION) {
      return { ok: false, errors: [{ field: 'coverImage', message: `La imagen es muy pequeña. Sube una de al menos ${MIN_IMAGE_DIMENSION}×${MIN_IMAGE_DIMENSION}px.` }] };
    }
  }

  return { ok: true, errors: [] };
}
