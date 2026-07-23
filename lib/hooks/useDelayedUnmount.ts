'use client';
import { useEffect, useState } from 'react';

/**
 * Keeps a conditionally-rendered element mounted for `delayMs` after `isOpen`
 * turns false, so its CSS exit transition can play before it leaves the DOM.
 */
export function useDelayedUnmount(isOpen: boolean, delayMs: number) {
  const [shouldRender, setShouldRender] = useState(isOpen);

  if (isOpen && !shouldRender) {
    setShouldRender(true);
  }

  useEffect(() => {
    if (isOpen) return;
    const timer = setTimeout(() => setShouldRender(false), delayMs);
    return () => clearTimeout(timer);
  }, [isOpen, delayMs]);

  return shouldRender;
}
