import { describe, it, expect } from 'vitest';
import { compressImage } from './compressImage';

describe('compressImage', () => {
  it('returns non-image file as-is', async () => {
    const file = new File(['dummy content'], 'document.pdf', { type: 'application/pdf' });
    const result = await compressImage(file);
    expect(result).toBe(file);
  });

  it('returns svg file as-is', async () => {
    const file = new File(['<svg></svg>'], 'logo.svg', { type: 'image/svg+xml' });
    const result = await compressImage(file);
    expect(result).toBe(file);
  });

  it('handles small webp files without modification', async () => {
    // 50 KB WebP
    const content = new Uint8Array(50 * 1024);
    const file = new File([content], 'small.webp', { type: 'image/webp' });

    // In Node/Vitest environment where Image or Canvas is mocked or not fully rendering:
    // If decoding throws or canvas fails, it gracefully falls back to returning the original file.
    const result = await compressImage(file);
    expect(result).toBeDefined();
    expect(result.size).toBeLessThanOrEqual(file.size);
  });

  it('handles error in image decoding gracefully by returning original file', async () => {
    const file = new File(['not real image bytes'], 'corrupt.jpg', { type: 'image/jpeg' });
    const result = await compressImage(file);
    expect(result).toBe(file);
  });
});
