'use client';
import { useEffect, useState } from 'react';

const TYPE_MS = 45;
const DELETE_MS = 25;
const HOLD_MS = 1500;
const GAP_MS = 300;
const CURSOR_BLINK_MS = 530;
const CURSOR = '|';

type Phase = 'typing' | 'deleting';

/**
 * Classic typewriter placeholder: types out each of `items` one character
 * at a time, holds, deletes it, then moves to the next. The returned string
 * already has the partial text + a blinking cursor glyph appended, so
 * callers just drop it straight into `placeholder` — no CSS involved, the
 * animation lives entirely in the text content.
 * Pauses while `paused` is true (e.g. the field already has a value, where
 * the placeholder isn't even visible) instead of ticking for nothing.
 */
export function useRotatingPlaceholder(items: string[], paused = false) {
  const [itemIndex, setItemIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [phase, setPhase] = useState<Phase>('typing');
  const [cursorOn, setCursorOn] = useState(true);

  const current = items[itemIndex] ?? '';

  useEffect(() => {
    if (paused || items.length === 0) return;

    if (phase === 'typing') {
      if (charCount < current.length) {
        const timer = setTimeout(() => setCharCount(c => c + 1), TYPE_MS);
        return () => clearTimeout(timer);
      }
      if (items.length <= 1) return; // nothing to cycle to — stay put, fully typed
      const timer = setTimeout(() => setPhase('deleting'), HOLD_MS);
      return () => clearTimeout(timer);
    }

    // phase === 'deleting'
    if (charCount > 0) {
      const timer = setTimeout(() => setCharCount(c => c - 1), DELETE_MS);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setItemIndex(i => (i + 1) % items.length);
      setPhase('typing');
    }, GAP_MS);
    return () => clearTimeout(timer);
  }, [phase, charCount, current, paused, items.length]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setCursorOn(c => !c), CURSOR_BLINK_MS);
    return () => clearInterval(timer);
  }, [paused]);

  return current.slice(0, charCount) + (cursorOn ? CURSOR : ' ');
}
