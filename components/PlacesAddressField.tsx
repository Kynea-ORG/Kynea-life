'use client';
import { useState, useRef, useEffect } from 'react';

// ─── Google Places (PlaceAutocompleteElement) — env-gated ────────────────────
// Web Component API (not the classic `google.maps.places.Autocomplete`, which
// is unavailable to new Maps customers as of 2025-03-01). Degrades to a plain
// <input> when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is unset or loading fails.
//
// Extracted from CrearClaseForm.tsx so onboarding/convertir-academia can
// reuse the exact same widget instead of duplicating the script-loading
// dance — three copies of this would be a lot of tricky-to-get-right code.

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface GoogleAddressComponent { longText?: string; shortText?: string; types: string[] }

interface GooglePlaceResult {
  placeId?: string;
  formattedAddress?: string;
  displayName?: string;
  location?: { lat: () => number; lng: () => number } | null;
  addressComponents?: GoogleAddressComponent[];
  fetchFields: (opts: { fields: string[] }) => Promise<void>;
}

// Peru's UBIGEO hierarchy doesn't map 1:1 to Google's generic admin-boundary
// types, but this is the closest stable match: provincia ~ administrative_area_level_2
// (falls back to level_1 — departamento — when Google has no finer data for a
// place), distrito ~ locality (falls back to sublocality for edge cases where
// Google files it one level down).
function extractCityDistrict(components: GoogleAddressComponent[]): { city: string; district: string } {
  const find = (type: string) => components.find(c => c.types.includes(type))?.longText ?? '';
  const city = find('administrative_area_level_2') || find('administrative_area_level_1');
  const district = find('locality') || find('sublocality') || find('sublocality_level_1');
  return { city, district };
}

interface GmpSelectEvent extends Event {
  placePrediction: { toPlace: () => GooglePlaceResult };
}

type PlaceAutocompleteElementInstance = HTMLElement & { value?: string };

interface GoogleMapsPlacesLibrary {
  PlaceAutocompleteElement: new () => PlaceAutocompleteElementInstance;
}

interface GoogleMapsNamespace {
  maps: { importLibrary: (library: string) => Promise<unknown> };
}

declare global {
  interface Window { google?: GoogleMapsNamespace }
}

let mapsScriptPromise: Promise<void> | null = null;

// `google.maps.importLibrary` isn't attached synchronously when the bootstrap
// <script> fires `onload` — Google's loader defines `google.maps` as an empty
// stub immediately, then loads a second internal script that attaches
// `importLibrary` moments later. Waiting on `onload` alone races that second
// load and reliably loses (~500ms), leaving `importLibrary` undefined even
// though the script "loaded" successfully.
function waitForImportLibrary(timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (typeof window.google?.maps?.importLibrary === 'function') { resolve(); return; }
      if (Date.now() - start > timeoutMs) { reject(new Error('Google Maps no terminó de cargar')); return; }
      setTimeout(check, 100);
    };
    check();
  });
}

export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (typeof window.google?.maps?.importLibrary === 'function') return Promise.resolve();
  if (mapsScriptPromise) return mapsScriptPromise;
  mapsScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`;
    script.async = true;
    script.onload = () => waitForImportLibrary().then(resolve, reject);
    script.onerror = () => reject(new Error('No se pudo cargar Google Maps'));
    document.head.appendChild(script);
  });
  return mapsScriptPromise;
}

export interface PlaceSelection { address: string; placeId: string; lat: number; lng: number; city: string; district: string }

export default function PlacesAddressField({
  value, onManualChange, onPlaceSelect, placeholder, onFallbackChange,
}: {
  value: string;
  onManualChange: (v: string) => void;
  onPlaceSelect: (selection: PlaceSelection) => void;
  placeholder: string;
  // Called with `true` once we know the address field is running in plain-
  // <input> mode (no API key, or the script/widget failed to load) — the
  // parent uses this to show manual Ciudad/Distrito inputs, since in that
  // mode nothing else can populate them (see extractCityDistrict — those
  // values normally only ever come from a selected Google prediction).
  onFallbackChange?: (fallback: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  useEffect(() => { onPlaceSelectRef.current = onPlaceSelect; }, [onPlaceSelect]);
  const placeholderRef = useRef(placeholder);
  useEffect(() => { placeholderRef.current = placeholder; }, [placeholder]);
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);
  const [initFailed, setInitFailed] = useState(false);

  useEffect(() => {
    onFallbackChange?.(!GOOGLE_MAPS_API_KEY || initFailed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initFailed]);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;
    const container = containerRef.current;
    let element: PlaceAutocompleteElementInstance | null = null;
    let cancelled = false;

    (async () => {
      try {
        await loadGoogleMapsScript(GOOGLE_MAPS_API_KEY);
        if (cancelled || !window.google || !container) return;
        const { PlaceAutocompleteElement } = await window.google.maps.importLibrary('places') as GoogleMapsPlacesLibrary;
        if (cancelled) return;
        element = new PlaceAutocompleteElement();
        element.setAttribute('placeholder', placeholderRef.current);
        // Uncontrolled Web Component: unlike a plain <input>, it doesn't read
        // React's `value` prop, so when editing an existing class its address
        // rendered blank even though `form.address` still held the real value.
        // Pre-fill the widget's own internal text with the value it had at
        // mount (edit mode) so it doesn't look reset until the user searches.
        if (valueRef.current) element.value = valueRef.current;
        // Google's own leading icon (#5e5e5e) is darker than the rest of the
        // app's inputs — projected via its `input-icon` slot, so swap it for
        // the same lucide "search" glyph + neutral-400 used everywhere else
        // an input has a leading search icon (see ClasesContent.tsx, HomeClient.tsx).
        const icon = document.createElement('span');
        icon.setAttribute('slot', 'input-icon');
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.34-4.34"/></svg>';
        icon.style.color = 'var(--color-neutral-400)';
        icon.style.display = 'flex';
        element.appendChild(icon);
        container.appendChild(element);
        element.addEventListener('gmp-select', (async (event: Event) => {
          const place = (event as GmpSelectEvent).placePrediction.toPlace();
          await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'addressComponents'] });
          const { city, district } = extractCityDistrict(place.addressComponents ?? []);
          onPlaceSelectRef.current({
            address: place.formattedAddress ?? '',
            placeId: place.placeId ?? '',
            lat: place.location ? place.location.lat() : 0,
            lng: place.location ? place.location.lng() : 0,
            city,
            district,
          });
        }) as EventListener);
        // The script can load fine while every actual prediction request
        // still fails at runtime (e.g. the API key's referrer restrictions
        // don't cover the current domain) — that doesn't throw here or fire
        // script.onerror, it just logs and emits 'gmp-error' per keystroke
        // while silently never producing a selectable prediction. Treat it
        // the same as a load failure: drop to the manual-input fallback.
        element.addEventListener('gmp-error', () => {
          if (!cancelled) setInitFailed(true);
        });
      } catch (err) {
        console.error('[PlacesAddressField] Google Maps init failed', err);
        if (!cancelled) setInitFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (element && container?.contains(element)) {
        container.removeChild(element);
      }
    };
  }, []);

  if (!GOOGLE_MAPS_API_KEY || initFailed) {
    return (
      <input className="input" value={value} onChange={e => onManualChange(e.target.value)} placeholder={placeholder} />
    );
  }

  return <div ref={containerRef} />;
}
