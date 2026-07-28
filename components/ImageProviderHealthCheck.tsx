'use client';
import { useEffect } from 'react';
import { checkImageProvider } from '@/lib/images/checkImageProvider';

// Módulo, no useRef: sobrevive a remounts del componente (ej. navegación),
// así el check corre una sola vez por carga de la app, no por cada mount.
let hasRun = false;

/** Avisa en consola, una sola vez en desarrollo, si el proveedor de imágenes activo no responde. No bloquea el render — corre en segundo plano. */
export default function ImageProviderHealthCheck() {
  useEffect(() => {
    if (hasRun) return;
    if (process.env.NODE_ENV !== 'development') return;
    if (process.env.NEXT_PUBLIC_IMAGE_HEALTHCHECK === 'false') return;
    hasRun = true;

    checkImageProvider().then(ok => {
      if (!ok) {
        const provider = process.env.NEXT_PUBLIC_IMAGE_PROVIDER === 'imagekit' ? 'ImageKit' : 'wsrv.nl';
        console.warn(`[ImageProviderHealthCheck] ${provider} no respondió — SmartImage caerá a las imágenes originales de Supabase si hace falta.`);
      }
    });
  }, []);

  return null;
}
