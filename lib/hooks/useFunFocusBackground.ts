'use client';
import { useCallback, useRef, useState } from 'react';

function nextHue(current: number): number {
  let hue = Math.floor(Math.random() * 360);
  // Guarantee a perceptible jump — a same-neighborhood hue reads as "nothing happened".
  while (Math.abs(hue - current) < 40) hue = Math.floor(Math.random() * 360);
  return hue;
}

/**
 * Full-bleed background color reaction for login/register: every trigger
 * (input focus, button/link click, checkbox change) shifts the whole page
 * background to a new random hue and replays a squash-settle pulse.
 *
 * The color transition and the pulse are split across two concerns on the
 * SAME element on purpose: `bgColor` drives a React-state-driven inline
 * style so the crossfade animates via a plain CSS `transition` (the element
 * never unmounts, so the browser can interpolate old → new color). The pulse
 * is replayed imperatively (remove class, force reflow, re-add class) via
 * `bgRef` instead of a React `key` remount — a key remount would also
 * unmount the color transition's starting state and any focused descendant,
 * which is exactly wrong here since focus is often the trigger itself.
 */
export function useFunFocusBackground(initialHue = 260) {
  const [hue, setHue] = useState(initialHue);
  const bgRef = useRef<HTMLDivElement>(null);

  const shift = useCallback(() => {
    setHue(h => nextHue(h));
    const el = bgRef.current;
    if (el) {
      el.classList.remove('animate-bg-pulse');
      void el.offsetWidth; // force reflow so the same animation class can replay
      el.classList.add('animate-bg-pulse');
    }
  }, []);

  return {
    bgColor: `oklch(78% 0.16 ${hue})`,
    bgRef,
    shift,
  };
}
