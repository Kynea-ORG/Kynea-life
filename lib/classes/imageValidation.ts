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

// ─── Validator ──────────────────────────────────────────────────────────────

export interface ImageFileInput {
  type: string;
  size: number;
  head: Uint8Array;
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

  return { ok: true, errors: [] };
}
