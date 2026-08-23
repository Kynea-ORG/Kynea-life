'use client';
import { useState } from 'react';
import { MapPin } from 'lucide-react';
import GoogleMap from './GoogleMap';

// Airbnb/Booking-style map preview: the collapsed state is a plain CSS
// placeholder — a dotted/grid pattern + pin icon — that never calls any
// Google API, since it renders once per card/section on every page load.
// Only clicking it mounts a real interactive GoogleMap (one Dynamic Maps JS
// load, the same kind any map app pays for), so passive browsing costs
// nothing and the expensive real map only loads when someone actually asks
// to see it.
export default function MapPreview({
  lat,
  lng,
  label,
  className = 'h-32',
}: {
  lat: number;
  lng: number;
  label?: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return (
      <div className={`relative rounded-xl overflow-hidden border border-neutral-200 ${className}`}>
        <GoogleMap pins={[{ id: 'preview', lat, lng, title: label }]} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setExpanded(true)}
      className={`relative w-full rounded-xl overflow-hidden border border-neutral-200 group ${className}`}
      style={{
        backgroundImage: 'radial-gradient(circle, var(--color-neutral-300) 1px, transparent 1px)',
        backgroundSize: '14px 14px',
        backgroundColor: 'var(--color-neutral-50)',
      }}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 group-hover:bg-neutral-900/5 transition-colors">
        <div className="w-8 h-8 rounded-full bg-white border border-neutral-900 flex items-center justify-center shadow-sm">
          <MapPin className="w-4 h-4 text-primary" />
        </div>
        <span className="text-[12px] font-semibold text-neutral-700 bg-white/90 px-2 py-0.5 rounded-full">
          Ver mapa{label ? ` · ${label}` : ''}
        </span>
      </div>
    </button>
  );
}
