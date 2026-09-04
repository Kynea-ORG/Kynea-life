'use client';
// Custom loader para next/image — evita el optimizador de Vercel (cuota
// agotada en el plan Hobby, devuelve 402) sirviendo las imágenes a través de
// un proveedor externo. El proveedor activo se elige con una env var, sin
// tocar los componentes que usan <Image>. Ver "Optimización de imágenes" en
// el README para el detalle de cada proveedor y cómo migrar entre ellos.
//
// 'use client' es obligatorio: Next.js serializa esta función para el
// cliente (ver docs/01-app/03-api-reference/05-config/01-next-config-js/images.md).

type ImageLoaderParams = {
  src: string;
  width: number;
  quality?: number;
};

type ImageProvider = 'wsrv' | 'imagekit';

function resolveProvider(): ImageProvider {
  const raw = process.env.NEXT_PUBLIC_IMAGE_PROVIDER;
  // Fallback seguro: cualquier valor no reconocido (incluyendo ausente o mal
  // tipeado) cae a wsrv, que no requiere configuración adicional.
  return raw === 'imagekit' ? 'imagekit' : 'wsrv';
}

function buildWsrvUrl({ src, width, quality = 75 }: ImageLoaderParams): string {
  // wsrv.nl reenvía la imagen original (`default`) si la transformación
  // falla, así nunca rompe el <img> aunque el proveedor tenga un hiccup.
  const params = new URLSearchParams({
    url: src,
    w: String(width),
    q: String(quality),
    output: 'webp',
    default: src,
  });
  return `https://wsrv.nl/?${params.toString()}`;
}

function buildImageKitUrl({ src, width, quality = 75 }: ImageLoaderParams): string {
  const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
  if (!endpoint) {
    // Sin endpoint configurado no hay forma de armar la URL de ImageKit —
    // wsrv es el fallback seguro en vez de servir una URL rota.
    return buildWsrvUrl({ src, width, quality });
  }

  const cleanEndpoint = endpoint.replace(/\/+$/, '');
  const transformations = `tr=w-${width},q-${quality},f-auto`;

  // Variante "web proxy": ImageKit hace fetch de la URL remota de Supabase
  // y la transforma al vuelo. No requiere configurar un origin en el
  // dashboard de ImageKit, solo tener el URL-endpoint de la cuenta.
  return `${cleanEndpoint}/${encodeURIComponent(src)}?${transformations}`;

  // Variante alternativa "external storage": si en el dashboard de ImageKit
  // se configura un origin apuntando directo al bucket de Supabase Storage,
  // se puede servir por la ruta del archivo en vez de la URL completa,
  // evitando el encodeURIComponent de una URL absoluta:
  //
  // const path = new URL(src).pathname.replace(/^\/storage\/v1\/object\/public\//, '');
  // return `${endpoint}/${path}?${transformations}`;
}

export default function imageLoader({ src, width, quality }: ImageLoaderParams): string {
  // Assets locales (public/, ej. /logo.png) no son fetcheables por wsrv.nl
  // ni ImageKit — ambos necesitan una URL absoluta para poder descargarla y
  // transformarla. No necesitan optimización remota de todos modos (ya se
  // sirven directo desde Vercel/CDN). El `w` es inofensivo (Vercel/Next
  // ignoran query strings al servir archivos estáticos) — solo está para que
  // la URL varíe con `width`, que es lo que next/image espera de un loader en
  // dev (si no, avisa "loader property that does not implement width").
  if (!src.startsWith('http')) {
    const separator = src.includes('?') ? '&' : '?';
    return `${src}${separator}w=${width}`;
  }

  const provider = resolveProvider();

  if (provider === 'imagekit') {
    return buildImageKitUrl({ src, width, quality });
  }

  return buildWsrvUrl({ src, width, quality });
}
