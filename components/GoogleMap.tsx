'use client';
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { loadGoogleMapsScript } from './PlacesAddressField';

// Real interactive Google Map — only ever mounted on demand (see
// MapPreview.tsx), never passively on page load, so every mount here is a
// genuine "user asked to see the map" moment and the Dynamic Maps JS load it
// costs is the expected/acceptable one. No `@types/google.maps` in this repo
// (see PlacesAddressField.tsx for the same call) — minimal hand-rolled types
// instead of pulling in the full types package for a handful of calls.

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  /** Rendered inside the pin's title attribute (native browser tooltip). */
  title?: string;
}

interface GoogleLatLngBoundsInstance {
  extend: (pos: { lat: number; lng: number }) => void;
}
interface GoogleMapInstance {
  fitBounds: (bounds: GoogleLatLngBoundsInstance, padding?: number) => void;
  setCenter: (pos: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
}
interface GoogleMarkerInstance {
  addListener: (event: string, handler: () => void) => void;
  setMap: (map: GoogleMapInstance | null) => void;
}
interface GoogleMapsMapsLibrary {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => GoogleMapInstance;
  LatLngBounds: new () => GoogleLatLngBoundsInstance;
}
interface GoogleMapsMarkerLibrary {
  Marker: new (opts: Record<string, unknown>) => GoogleMarkerInstance;
}

declare global {
  interface Window {
    google?: { maps: { importLibrary: (library: string) => Promise<unknown> } };
  }
}

export default function GoogleMap({
  pins,
  onPinClick,
  className = 'w-full h-full',
}: {
  pins: MapPin[];
  onPinClick?: (id: string) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const markersRef = useRef<Map<string, GoogleMarkerInstance>>(new Map());
  const onPinClickRef = useRef(onPinClick);
  useEffect(() => { onPinClickRef.current = onPinClick; }, [onPinClick]);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Mount the map + markers once. Pins are read fresh via a ref-captured
  // closure per marker click, so this intentionally doesn't re-run when
  // `pins` changes shape — a map view's marker set is effectively static
  // for the life of the mount (a fresh GoogleMap instance is used instead
  // of diffing markers in place, matching how MapPreview/ClasesMapView use it).
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;
    const container = containerRef.current;
    if (!container || pins.length === 0) return;
    let cancelled = false;
    const markers = markersRef.current;

    (async () => {
      try {
        await loadGoogleMapsScript(GOOGLE_MAPS_API_KEY);
        if (cancelled || !window.google) return;
        const [{ Map, LatLngBounds }, { Marker }] = await Promise.all([
          window.google.maps.importLibrary('maps') as Promise<GoogleMapsMapsLibrary>,
          window.google.maps.importLibrary('marker') as Promise<GoogleMapsMarkerLibrary>,
        ]);
        if (cancelled || !container) return;

        const map = new Map(container, {
          center: { lat: pins[0].lat, lng: pins[0].lng },
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: true,
        });
        mapRef.current = map;

        if (pins.length === 1) {
          map.setCenter({ lat: pins[0].lat, lng: pins[0].lng });
        } else {
          const bounds = new LatLngBounds();
          pins.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
          map.fitBounds(bounds, 48);
        }

        pins.forEach(pin => {
          const marker = new Marker({
            position: { lat: pin.lat, lng: pin.lng },
            map,
            title: pin.title,
          });
          marker.addListener('click', () => onPinClickRef.current?.(pin.id));
          markers.set(pin.id, marker);
        });
        if (!cancelled) setLoaded(true);
      } catch (err) {
        console.error('[GoogleMap] init failed', err);
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
      markers.forEach(m => m.setMap(null));
      markers.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error || !GOOGLE_MAPS_API_KEY) {
    return (
      <div className={`${className} flex items-center justify-center bg-neutral-100 text-[13px] text-neutral-400`}>
        No se pudo cargar el mapa
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 pointer-events-none">
          <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
        </div>
      )}
    </div>
  );
}
