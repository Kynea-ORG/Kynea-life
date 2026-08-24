'use client';
import { useState } from 'react';
import { MapPin } from 'lucide-react';
import GoogleMap from './GoogleMap';
import SmartImage from './SmartImage';

// Cost story: `previewImageUrl` is a Static Maps snapshot cached once per
// venue (see lib/maps/staticMap.ts, generated on venue save — not on every
// page view). When it's there, this shows that real map image and only
// mounts the interactive GoogleMap (a real Dynamic Maps JS load) on click —
// so passive browsing costs nothing. There's no decorative placeholder for
// the "no cached image yet" case (a venue saved before this existed, the
// Static Maps API not enabled on the Google Cloud project yet, or the
// generation call failing) — showing a fake dotted-grid box in place of a
// real map read as broken, not "tap to load". That case just shows the real
// map directly, same as `expanded`.
export default function MapPreview({
  lat,
  lng,
  label,
  previewImageUrl,
  className = 'h-32',
}: {
  lat: number;
  lng: number;
  label?: string;
  previewImageUrl?: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (expanded || !previewImageUrl) {
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
    >
      <SmartImage src={previewImageUrl} alt="" fill sizes="(min-width: 1024px) 700px, 100vw" className="object-cover" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/0 group-hover:bg-black/10 transition-colors">
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
