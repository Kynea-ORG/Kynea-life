'use client';
import { useState, useRef, useEffect } from 'react';
import Image, { type ImageProps } from 'next/image';

type SmartImageProps = Omit<ImageProps, 'src'> & { src: string; alt: string };

type LoadState = 'ok' | 'fallback' | 'broken';

export default function SmartImage({ src, alt, onError, unoptimized, priority, fill, className, style, ...rest }: SmartImageProps) {
  const [state, setState] = useState<LoadState>('ok');
  const [isInView, setIsInView] = useState(() => {
    if (priority) return true;
    if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) return true;
    return false;
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority || isInView) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [priority, isInView]);

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
      console.warn(`[SmartImage] La imagen original también falló para ${src}`);
      setState('broken');
    }
    onError?.(e);
  }

  if (!isInView && !priority) {
    return (
      <div
        ref={containerRef}
        className={`${fill ? 'absolute inset-0 ' : ''}w-full h-full bg-neutral-100 ${className || ''}`}
        style={style}
        aria-hidden="true"
      />
    );
  }

  return (
    <Image
      {...rest}
      fill={fill}
      className={className}
      style={style}
      priority={priority}
      src={src}
      alt={alt}
      unoptimized={state !== 'ok' || unoptimized}
      onError={handleError}
    />
  );
}
