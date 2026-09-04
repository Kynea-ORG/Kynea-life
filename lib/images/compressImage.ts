// Client-only helper: resizes and compresses image files in the browser before
// uploading to Supabase Storage.
//
// By converting heavy smartphone/camera photos (typically 3-5 MB) to optimized
// WebP (~100-150 KB) at a max dimension of 1400px, this cuts bandwidth transfer
// (Egress and Cached Egress) by ~95-97% without any noticeable loss in visual quality
// on retina screens.

export interface CompressImageOptions {
  /** Maximum width or height in pixels. Defaults to 1400. */
  maxDimension?: number;
  /** Compression quality between 0 and 1. Defaults to 0.82. */
  quality?: number;
}

const DEFAULT_MAX_DIMENSION = 1400;
const DEFAULT_QUALITY = 0.82;

/**
 * Compresses an image file in the browser using HTML5 Canvas.
 * Returns a new File object with MIME type 'image/webp' (or 'image/jpeg' fallback).
 * If compression is unsupported, fails, or produces a larger file, returns the original file.
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  // Only run in the browser
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file;
  }

  // Do not attempt to process non-image or SVG files
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file;
  }

  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_QUALITY;

  try {
    const objectUrl = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('No se pudo decodificar la imagen'));
      el.src = objectUrl;
    });
    URL.revokeObjectURL(objectUrl);

    const origWidth = img.naturalWidth || img.width;
    const origHeight = img.naturalHeight || img.height;

    // If image is already tiny and WebP, no need to touch it
    if (origWidth <= maxDimension && origHeight <= maxDimension && file.type === 'image/webp' && file.size < 150 * 1024) {
      return file;
    }

    // Calculate scaled dimensions keeping aspect ratio
    let targetWidth = origWidth;
    let targetHeight = origHeight;

    if (targetWidth > maxDimension || targetHeight > maxDimension) {
      if (targetWidth >= targetHeight) {
        targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
        targetWidth = maxDimension;
      } else {
        targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
        targetHeight = maxDimension;
      }
    }

    // Draw on offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return file;
    }

    // High quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // Try exporting as image/webp first
    let blob: Blob | null = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/webp', quality);
    });

    let outputType = 'image/webp';
    let ext = 'webp';

    // Fallback to jpeg if browser doesn't support webp encoding on canvas
    if (!blob || blob.type !== 'image/webp') {
      blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', quality);
      });
      outputType = 'image/jpeg';
      ext = 'jpg';
    }

    if (!blob) {
      return file;
    }

    // If the compressed version is somehow larger than the original, keep original
    if (blob.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.${ext}`, {
      type: outputType,
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn('[compressImage] Falló la compresión en cliente, usando archivo original:', err);
    return file;
  }
}
