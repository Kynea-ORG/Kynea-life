'use client';
import { useRef, useState } from 'react';
import Image from 'next/image';
import { Move, ZoomIn, ZoomOut } from 'lucide-react';

interface ImagePositionPickerProps {
  src: string;
  value: string;
  onChange: (position: string) => void;
  onDragEnd?: (position: string) => void;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  onZoomDragEnd?: (zoom: number) => void;
  frameClassName: string;
  sizes?: string;
  /** Narrow avatar contexts (circle/square) — drops the hint sentence so it
   * doesn't wrap awkwardly under a small frame; the drag affordance is still
   * conveyed by the move icon on the image itself. */
  compact?: boolean;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function parsePosition(value: string): { x: number; y: number } {
  const [x, y] = value.split(' ').map(v => parseFloat(v));
  return {
    x: Number.isFinite(x) ? x : 50,
    y: Number.isFinite(y) ? y : 50,
  };
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Drag-to-reposition + zoom preview for an object-cover image. Lets the user
 * choose which part of an oversized/odd-aspect photo stays visible once
 * cropped — dragging shifts the CSS object-position focal point and the zoom
 * slider scales the image via transform, instead of cropping the file itself,
 * so the original upload is never modified.
 */
export default function ImagePositionPicker({
  src, value, onChange, onDragEnd,
  zoom = 1, onZoomChange, onZoomDragEnd,
  frameClassName, sizes = '400px', compact = false,
}: ImagePositionPickerProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ pointerX: number; pointerY: number; posX: number; posY: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const { x, y } = parsePosition(value);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStart.current = { pointerX: e.clientX, pointerY: e.clientY, posX: x, posY: y };
    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart.current || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    const deltaXPercent = ((e.clientX - dragStart.current.pointerX) / rect.width) * 100;
    const deltaYPercent = ((e.clientY - dragStart.current.pointerY) / rect.height) * 100;
    // Dragging the photo right reveals more of its left edge, so the focal
    // point (object-position) moves the opposite way from the pointer.
    const nextX = clamp(dragStart.current.posX - deltaXPercent, 0, 100);
    const nextY = clamp(dragStart.current.posY - deltaYPercent, 0, 100);
    onChange(`${Math.round(nextX)}% ${Math.round(nextY)}%`);
  }

  function handlePointerUp() {
    dragStart.current = null;
    setDragging(false);
    onDragEnd?.(`${Math.round(x)}% ${Math.round(y)}%`);
  }

  function handleZoomInput(next: number) {
    const clamped = clamp(next, MIN_ZOOM, MAX_ZOOM);
    onZoomChange?.(clamped);
  }

  const isDefault = x !== 50 || y !== 50 || zoom !== 1;

  return (
    <div>
      <div
        ref={frameRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`relative overflow-hidden touch-none select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'} ${frameClassName}`}
      >
        <Image
          src={src}
          alt="Vista previa"
          fill
          sizes={sizes}
          draggable={false}
          className="object-cover pointer-events-none"
          style={{ objectPosition: `${x}% ${y}%`, transform: `scale(${zoom})` }}
        />
        <div className="absolute bottom-2 right-2 bg-neutral-900/70 text-white rounded-full p-1.5 pointer-events-none">
          <Move className="w-3.5 h-3.5" />
        </div>
      </div>

      {onZoomChange && (
        <div className="flex items-center gap-2 mt-2">
          <ZoomOut className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.05}
            value={zoom}
            onChange={e => handleZoomInput(parseFloat(e.target.value))}
            onPointerUp={() => onZoomDragEnd?.(zoom)}
            className="flex-1 accent-primary"
          />
          <ZoomIn className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        </div>
      )}

      {(!compact || isDefault) && (
        <div className={`flex items-center mt-1.5 ${compact ? 'justify-end' : 'justify-between'}`}>
          {!compact && <p className="text-xs text-neutral-500">Arrastra la foto para centrarla</p>}
          {isDefault && (
            <button
              type="button"
              onClick={() => {
                onChange('50% 50%');
                onDragEnd?.('50% 50%');
                onZoomChange?.(1);
                onZoomDragEnd?.(1);
              }}
              className="text-xs font-semibold text-primary hover:text-primary-dark"
            >
              Restablecer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
