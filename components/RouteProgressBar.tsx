'use client';

import { useEffect, useState, useRef, Suspense, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { ROUTE_PROGRESS_START_EVENT, ROUTE_PROGRESS_STOP_EVENT } from '@/lib/navigation/progress';

function RouteObserver({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Ignoramos el primer montaje para no disparar la finalización en frío
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    onNavigate();
  }, [pathname, searchParams, onNavigate]);

  return null;
}

export default function RouteProgressBar() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const trickleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const finishTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (trickleTimerRef.current) clearInterval(trickleTimerRef.current);
    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
  }, []);

  const finishProgress = useCallback(() => {
    clearTimers();
    setIsFinishing(true);
    setProgress(100);

    // Esperar a que la barra complete el 100% antes de iniciar el fade-out
    finishTimeoutRef.current = setTimeout(() => {
      setVisible(false);
      // Resetear el estado tras terminar la animación de opacidad
      resetTimeoutRef.current = setTimeout(() => {
        setProgress(0);
        setIsFinishing(false);
      }, 300);
    }, 220);
  }, [clearTimers]);

  const startProgress = useCallback(() => {
    clearTimers();
    setIsFinishing(false);
    setVisible(true);
    setProgress(18);

    // Simulación de avance trickle: 18% -> 40% -> 65% -> 80% -> máx 92%
    trickleTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 40) return prev + Math.floor(Math.random() * 12 + 8);
        if (prev < 70) return prev + Math.floor(Math.random() * 8 + 4);
        if (prev < 88) return prev + Math.floor(Math.random() * 4 + 1);
        if (prev < 93) return prev + 1;
        return prev;
      });
    }, 220);

    // Timeout de seguridad: auto-completar si la navegación demora más de 8s o falla silenciosamente
    safetyTimeoutRef.current = setTimeout(() => {
      finishProgress();
    }, 8000);
  }, [clearTimers, finishProgress]);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Ignorar clics con modificadores de teclado (abrir en nueva pestaña/ventana)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.defaultPrevented) return;

      const anchor = (e.target as HTMLElement)?.closest('a');
      if (!anchor) return;

      // Ignorar enlaces sin href o con destinos especiales
      const href = anchor.getAttribute('href');
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:')
      ) {
        return;
      }

      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      try {
        const targetUrl = new URL(anchor.href, window.location.href);
        const currentUrl = new URL(window.location.href);

        // Solo enlaces internos (mismo origen)
        if (targetUrl.origin !== currentUrl.origin) return;

        // Ignorar saltos hash en la misma página
        if (targetUrl.pathname === currentUrl.pathname && targetUrl.search === currentUrl.search) {
          return;
        }

        startProgress();
      } catch {
        // Enlace no parseable, omitir
      }
    };

    const handleCustomStart = () => startProgress();
    const handleCustomStop = () => finishProgress();
    const handlePopState = () => startProgress();

    // Usamos fase de captura para feedback visual en 0ms
    document.addEventListener('click', handleDocumentClick, true);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener(ROUTE_PROGRESS_START_EVENT, handleCustomStart);
    window.addEventListener(ROUTE_PROGRESS_STOP_EVENT, handleCustomStop);

    return () => {
      clearTimers();
      document.removeEventListener('click', handleDocumentClick, true);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener(ROUTE_PROGRESS_START_EVENT, handleCustomStart);
      window.removeEventListener(ROUTE_PROGRESS_STOP_EVENT, handleCustomStop);
    };
  }, [startProgress, finishProgress, clearTimers]);

  return (
    <>
      <Suspense fallback={null}>
        <RouteObserver onNavigate={finishProgress} />
      </Suspense>

      {visible && (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label="Cargando página"
          className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none h-[2.5px] bg-transparent"
        >
          <div
            className="h-full bg-gradient-to-r from-primary via-fuchsia-500 to-primary-dark transition-all duration-200 ease-out relative"
            style={{
              width: `${progress}%`,
              opacity: isFinishing ? 0 : 1,
              transitionProperty: 'width, opacity',
              transitionDuration: isFinishing ? '200ms, 250ms' : '220ms, 150ms',
            }}
          >
            {/* Cabezal de brillo sutil en el extremo derecho de la barra */}
            <div
              className="absolute top-0 right-0 bottom-0 w-24 h-full shadow-[0_0_10px_#d946ef,0_0_5px_#8a11bc] opacity-90"
              aria-hidden="true"
            />
          </div>
        </div>
      )}
    </>
  );
}
