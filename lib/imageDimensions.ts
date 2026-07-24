// Client-only helper: reads a File's actual pixel dimensions before upload.
// Runs in the browser (decodes via the Image element) — never import from
// server code. Used to reject images too small to crop cleanly into the
// square/wide card frames these photos get displayed in (a low-res or
// thumbnail-sized upload looks pixelated and crops badly once zoomed).

export const MIN_IMAGE_DIMENSION = 400;

export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });
}
