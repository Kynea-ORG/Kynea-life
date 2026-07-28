'use client';
import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';

// El custom loader (image-loader.ts) es una función pura: no puede hacer
// try/catch de red ni fallback — solo construye una URL. Esta es la segunda
// línea de defensa (la primera es el default= de wsrv, ver README): si la
// imagen optimizada falla al cargar en el navegador, onError cae a servir
// `src` (que ya es la URL pública original de Supabase) con unoptimized,
// lo que le dice a next/image que NO llame al loader y pida el src tal cual.

type SmartImageProps = Omit<ImageProps, 'src'> & { src: string; alt: string };

type LoadState = 'ok' | 'fallback' | 'broken';

export default function SmartImage({ src, alt, onError, unoptimized, ...rest }: SmartImageProps) {
  const [state, setState] = useState<LoadState>('ok');

  // Si el src cambia (ej. el usuario reemplaza su foto de perfil), reintenta
  // la versión optimizada en vez de arrastrar el fallback de la imagen
  // anterior. Ajustar estado durante el render (no en un efecto/ref) es el
  // patrón recomendado por React para "resetear estado cuando cambia una
  // prop" — evita un render en cascada.
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setState('ok');
  }

  function handleError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
    if (state === 'ok') {
      console.warn(`[SmartImage] Optimización falló para ${src}, sirviendo original de Supabase`);
      setState('fallback');
    } else if (state === 'fallback') {
      // Ya estamos sirviendo el original sin optimizar y también falló (ej.
      // la URL de Supabase está rota) — no hay más fallback posible. No
      // reintentamos para evitar un bucle; logueamos una sola vez y quedamos
      // en 'broken', donde este handler ya no hace nada más.
      console.warn(`[SmartImage] La imagen original también falló para ${src}`);
      setState('broken');
    }
    onError?.(e);
  }

  return (
    <Image
      {...rest}
      src={src}
      alt={alt}
      unoptimized={state !== 'ok' || unoptimized}
      onError={handleError}
    />
  );
}
