import { SITE_URL } from '@/lib/constants';

// Health-check liviano y opcional del proveedor de optimización de imágenes
// activo (wsrv.nl / ImageKit). Pensado para correr UNA vez en desarrollo, no
// en cada render — ver components/ImageProviderHealthCheck.tsx, que lo
// invoca con un guard para no repetirlo.
//
// Usa /logo.png de producción (vía SITE_URL) como imagen de prueba: tiene
// que ser una URL públicamente alcanzable desde los servidores del
// proveedor, así que una ruta de localhost no sirve para este check.

function buildTestUrl(): string {
  const testImage = `${SITE_URL}/logo.png`;
  const provider = process.env.NEXT_PUBLIC_IMAGE_PROVIDER === 'imagekit' ? 'imagekit' : 'wsrv';

  if (provider === 'imagekit') {
    const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
    if (endpoint) {
      return `${endpoint}/${encodeURIComponent(testImage)}?tr=w-16`;
    }
    // Sin endpoint configurado, mismo fallback que usa el loader real.
  }

  return `https://wsrv.nl/?${new URLSearchParams({ url: testImage, w: '16' }).toString()}`;
}

/** Hace un HEAD al proveedor activo con una imagen de prueba. No lanza — cualquier fallo de red o respuesta no-OK se traduce en `false`. */
export async function checkImageProvider(): Promise<boolean> {
  try {
    const res = await fetch(buildTestUrl(), { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}
