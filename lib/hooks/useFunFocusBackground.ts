'use client';
import { useCallback, useState, type CSSProperties } from 'react';

function nextHue(current: number): number {
  let hue = Math.floor(Math.random() * 360);
  // Guarantee a perceptible jump — a same-neighborhood hue reads as "nothing happened".
  while (Math.abs(hue - current) < 40) hue = Math.floor(Math.random() * 360);
  return hue;
}

type State = { hue: number; prevHue: number; revealId: number; animStyle: 'circle' | 'sweep' };

/**
 * Full-bleed background color reaction for login/register: every trigger
 * (input focus, button/link click, checkbox change) shifts the whole page
 * background to a new random hue via a circular or diagonal wipe reveal,
 * alternating style each trigger.
 *
 * `baseColor` paints the settled color underneath; `revealStyle` (keyed by
 * `revealId`, so React remounts a fresh element every trigger instead of
 * reusing one) animates the new hue in on top via clip-path/translate —
 * once the animation ends `forwards` it fully covers the base layer, so the
 * next trigger's base color (captured as `prevHue` = the hue visible right
 * before this shift) never causes a visible gap or flash.
 */
export function useFunFocusBackground(initialHue = 260) {
  const [state, setState] = useState<State>({ hue: initialHue, prevHue: initialHue, revealId: 0, animStyle: 'circle' });

  const shift = useCallback(() => {
    setState(s => ({
      hue: nextHue(s.hue),
      prevHue: s.hue,
      revealId: s.revealId + 1,
      animStyle: s.animStyle === 'circle' ? 'sweep' : 'circle',
    }));
  }, []);

  const baseColor = `oklch(78% 0.16 ${state.prevHue})`;
  const revealColor = `oklch(78% 0.16 ${state.hue})`;

  const revealStyle: CSSProperties = state.animStyle === 'sweep'
    ? {
        position: 'absolute', top: 0, bottom: 0, left: '-30%', width: '160%',
        background: revealColor,
        animation: 'diagonalSweep 900ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
      }
    : {
        position: 'absolute', inset: 0,
        background: revealColor,
        animation: 'circleReveal 1100ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
      };

  return { baseColor, revealId: state.revealId, revealStyle, shift };
}
