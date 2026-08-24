import type { SupabaseClient } from '@supabase/supabase-js';
import { MAP_STYLE, mapStyleToStaticParams } from './mapStyle';

// Server-only — nunca importar desde un componente cliente. Usa un fetch a
// la Static Maps API + Storage, no la carga de script de la Maps JavaScript
// API (esa es GoogleMap.tsx, cliente).
//
// Key server-side para la Static Maps API. A diferencia de un request desde
// el browser, uno server-side no manda header Referer — una key restringida
// por HTTP referrer (lo normal para la key pública de cara al cliente) va a
// rechazar este request. Configurar GOOGLE_MAPS_STATIC_API_KEY con una key
// separada restringida solo por API ("Maps Static API", sin restricción de
// referrer/IP) para que esto funcione en producción; en dev, donde la key
// pública suele no tener restricciones, el fallback alcanza.
const STATIC_MAPS_API_KEY = process.env.GOOGLE_MAPS_STATIC_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// scale:2 duplica la resolución final (retina) sin que el tamaño declarado
// cuente contra el límite de la API — el mismo truco que usa Google Maps.
const STATIC_MAP_SIZE = '640x400';

export function buildStaticMapUrl(lat: number, lng: number): string | null {
  if (!STATIC_MAPS_API_KEY) return null;
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: '15',
    size: STATIC_MAP_SIZE,
    scale: '2',
    maptype: 'roadmap',
    markers: `color:0x8a11bc|${lat},${lng}`,
    key: STATIC_MAPS_API_KEY,
  });
  mapStyleToStaticParams(MAP_STYLE).forEach(style => params.append('style', style));
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

// Genera un snapshot estático de marca para un local y lo cachea en Storage
// (bucket class-images, misma convención de RLS que las fotos de portada:
// <owner-id>/...) — así toda futura vista de una clase en ese local reusa la
// imagen guardada en vez de volver a llamar a la Static Maps API, que es lo
// que mantiene gratis navegar el detalle de clase (ver MapPreview.tsx).
// Nunca lanza: perder la imagen de preview es un problema cosmético
// (MapPreview cae a su placeholder CSS), no motivo para hacer fallar el
// guardado de la clase/local.
export async function generateAndCacheVenueMapImage(
  supabase: SupabaseClient,
  opts: { venueId: string; ownerId: string; lat: number; lng: number }
): Promise<string | null> {
  const url = buildStaticMapUrl(opts.lat, opts.lng);
  if (!url) return null;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error('[generateAndCacheVenueMapImage] Static Maps API', res.status, await res.text().catch(() => ''));
      return null;
    }
    const buffer = await res.arrayBuffer();

    const path = `${opts.ownerId}/venue-maps/${opts.venueId}.png`;
    const { error: uploadError } = await supabase.storage
      .from('class-images')
      .upload(path, buffer, { contentType: 'image/png', upsert: true });
    if (uploadError) {
      console.error('[generateAndCacheVenueMapImage] upload', uploadError.message);
      return null;
    }

    const { data } = supabase.storage.from('class-images').getPublicUrl(path);
    // Cache-busting: si el local se muda, `upsert` sobrescribe el mismo path
    // pero el navegador/CDN podría seguir sirviendo la imagen vieja cacheada
    // bajo esa misma URL sin el query param.
    const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from('venues')
      .update({ map_image_url: publicUrl })
      .eq('id', opts.venueId);
    if (updateError) {
      console.error('[generateAndCacheVenueMapImage] venues update', updateError.message);
      return null;
    }

    return publicUrl;
  } catch (err) {
    console.error('[generateAndCacheVenueMapImage] fallo inesperado', err);
    return null;
  }
}
