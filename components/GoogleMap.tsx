'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Plus, Minus, LocateFixed, Navigation } from 'lucide-react';
import { loadGoogleMapsScript } from './PlacesAddressField';
import { MAP_STYLE } from '@/lib/maps/mapStyle';
import { calculateDistanceKm } from '@/lib/utils';

// Real interactive Google Map — only ever mounted on demand (see
// MapPreview.tsx), never passively on page load, so every mount here is a
// genuine "user asked to see the map" moment and the Dynamic Maps JS load it
// costs is the expected/acceptable one. No `@types/google.maps` in this repo
// (see PlacesAddressField.tsx for the same call) — minimal hand-rolled types
// instead of pulling in the full types package for a handful of calls.
//
// Pins are built on `OverlayView` (plain DOM nodes positioned by lat/lng)
// instead of `Marker`/`AdvancedMarkerElement` — OverlayView lets them carry
// real Tailwind-styled HTML (the price pill), without needing a Map ID
// (AdvancedMarkerElement's requirement) configured in Google Cloud Console.
// The click-to-open card is a plain React element fixed to the bottom of
// the map panel (not an OverlayView tied to the pin's on-screen position) —
// it stays fully visible and in the same place regardless of where the
// selected pin currently sits, including when that's near the map's edge.

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  /** Rendered inside the pin's title attribute (native browser tooltip). */
  title?: string;
  /** Text on the pin's pill (e.g. "S/150/mes"). Omit for a plain dot pin —
   * used by MapPreview's single-location view, where there's nothing to
   * distinguish it from. */
  pillLabel?: string;
  /** Controls pill color — 'academia' gets the dark treatment that matches
   * its public profile banner, 'clase' (default) the white/purple one. */
  kind?: 'clase' | 'academia';
  /** Circular thumbnail shown at the pill's left edge. Omit for a text-only
   * pill (falls back gracefully on load failure too — see buildPinElement). */
  photo?: string;
}

interface GoogleLatLng { lat: () => number; lng: () => number }
interface GoogleLatLngBoundsInstance {
  extend: (pos: { lat: number; lng: number }) => void;
  contains: (pos: { lat: number; lng: number }) => boolean;
}
interface GoogleMapInstance {
  fitBounds: (bounds: GoogleLatLngBoundsInstance, padding?: number) => void;
  setCenter: (pos: { lat: number; lng: number }) => void;
  panTo: (pos: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  getZoom: () => number | undefined;
  getBounds: () => GoogleLatLngBoundsInstance | undefined;
  getCenter: () => GoogleLatLng | undefined;
  addListener: (event: string, handler: () => void) => void;
}
interface GoogleMapPanes { overlayMouseTarget: HTMLElement }
interface GoogleMapProjection { fromLatLngToDivPixel: (pos: GoogleLatLng) => { x: number; y: number } | null }
interface GoogleOverlayViewInstance {
  setMap: (map: GoogleMapInstance | null) => void;
  getPanes: () => GoogleMapPanes;
  getProjection: () => GoogleMapProjection;
}
// OverlayView is normally subclassed (onAdd/draw/onRemove) — hand-rolled as
// a loose constructor type since it's only known at runtime after import.
type GoogleOverlayViewClass = new () => GoogleOverlayViewInstance;
interface GoogleMapsMapsLibrary {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => GoogleMapInstance;
  OverlayView: GoogleOverlayViewClass & { preventMapHitsAndGesturesFrom: (el: HTMLElement) => void };
}
interface GoogleMapsCoreLibrary {
  LatLngBounds: new () => GoogleLatLngBoundsInstance;
  LatLng: new (lat: number, lng: number) => GoogleLatLng;
}

declare global {
  interface Window {
    google?: { maps: { importLibrary: (library: string) => Promise<unknown> } };
  }
}

function buildPinElement(pin: MapPin): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.top = '0';
  wrapper.style.left = '0';
  wrapper.style.cursor = 'pointer';
  wrapper.style.pointerEvents = 'auto';
  wrapper.style.willChange = 'transform';
  wrapper.style.zIndex = '1';
  wrapper.dataset.pinId = pin.id;

  if (!pin.pillLabel) {
    wrapper.className = 'w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md bg-primary';
    return wrapper;
  }

  const isAcademia = pin.kind === 'academia';
  wrapper.dataset.kind = isAcademia ? 'academia' : 'clase';
  // Sin gap entre pill y cola — la punta del triángulo cae exactamente sobre
  // la coordenada, sin un hueco visual entre pastilla y punto de anclaje.
  wrapper.className = 'flex flex-col items-center -translate-x-1/2 -translate-y-full';
  const pill = document.createElement('div');
  // Sin borde — solo sombra para dar definición (spec del pin de referencia).
  pill.className = `pin-pill flex items-center gap-1.5 ${pin.photo ? 'pl-1' : 'pl-3'} pr-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-[transform,background-color,color,box-shadow] duration-150 ${PIN_SHADOW.rest} ${
    isAcademia ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'
  }`;
  if (pin.photo) {
    const img = document.createElement('img');
    img.src = pin.photo;
    img.alt = '';
    img.decoding = 'async';
    img.loading = 'lazy';
    img.className = 'w-6 h-6 rounded-full object-cover shrink-0';
    // Broken/missing image: fall back to a text-only pill instead of showing
    // a broken-image glyph inside the pin.
    img.onerror = () => img.remove();
    pill.appendChild(img);
  }
  const label = document.createElement('span');
  label.textContent = pin.pillLabel ?? '';
  pill.appendChild(label);
  // Cola: triángulo sólido (sin bordes) en vez de un punto — mismo color que
  // el fondo actual de la pastilla, para que se lea como una sola forma.
  const tail = document.createElement('div');
  tail.className = `pin-tail w-0 h-0 border-x-[6px] border-x-transparent border-t-[7px] transition-colors duration-150 ${isAcademia ? 'border-t-neutral-900' : 'border-t-white'}`;
  wrapper.appendChild(pill);
  wrapper.appendChild(tail);
  return wrapper;
}

function buildUserLocationElement(): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.top = '0';
  wrapper.style.left = '0';
  wrapper.style.cursor = 'pointer';
  wrapper.style.pointerEvents = 'auto';
  wrapper.style.willChange = 'transform';
  wrapper.style.zIndex = '90';
  wrapper.title = 'Tu ubicación';
  wrapper.className = 'group flex items-center justify-center -translate-x-1/2 -translate-y-1/2';

  // Radar ping ring
  const ping = document.createElement('div');
  ping.className = 'absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping pointer-events-none';
  wrapper.appendChild(ping);

  // Soft halo
  const halo = document.createElement('div');
  halo.className = 'absolute w-6 h-6 rounded-full bg-blue-400/25 pointer-events-none';
  wrapper.appendChild(halo);

  // Core circle
  const dot = document.createElement('div');
  dot.className = 'relative w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-[0_2px_8px_rgba(37,99,235,0.6)] transition-transform group-hover:scale-125';
  wrapper.appendChild(dot);

  // Hover badge
  const badge = document.createElement('div');
  badge.className = 'absolute bottom-full mb-1.5 hidden group-hover:flex items-center px-2 py-0.5 rounded-full bg-neutral-900 text-white text-[11px] font-semibold whitespace-nowrap shadow-md pointer-events-none';
  badge.textContent = 'Tu ubicación';
  wrapper.appendChild(badge);

  return wrapper;
}

// Sombras exactas del diseño de referencia — reposo y hover se diferencian
// por elevación (blur/spread), no solo color.
const PIN_SHADOW = {
  rest: 'shadow-[0_2px_6px_rgba(13,13,13,.14),0_8px_20px_rgba(13,13,13,.10)]',
  hover: 'shadow-[0_4px_12px_rgba(13,13,13,.20),0_14px_32px_rgba(13,13,13,.16)]',
};

// Reposo / hover / seleccionado — tres estados en vez de dos. Un pin
// seleccionado se queda "emphasized" aunque el mouse lo abandone; hover solo
// aplica cuando el pin no está ya seleccionado (evita que un mouseleave
// apague el pin abierto). Solo los pines de clase (blancos) cambian de
// color; los de academia ya son oscuros, así que solo escalan. Seleccionado
// usa `animate-pulse-soft-primary` (globals.css, ya pensada para pines de
// mapa) como halo morado pulsante en vez de la sombra estática.
// z-index: seleccionado siempre al frente (100) para no quedar tapado por
// pines vecinos, hover en (50), y reposo en (1).
type PinState = 'rest' | 'hover' | 'selected';
function applyPinState(el: HTMLDivElement, pinState: PinState) {
  const selected = pinState === 'selected';
  const hovered = pinState === 'hover';
  el.style.zIndex = selected ? '100' : hovered ? '50' : '1';

  const pill = el.querySelector<HTMLDivElement>('.pin-pill');
  const tail = el.querySelector<HTMLDivElement>('.pin-tail');
  if (!pill) return; // plain-dot pin, nothing to toggle
  pill.classList.toggle('scale-110', selected);
  pill.classList.toggle('scale-105', hovered);
  pill.classList.toggle('animate-pulse-soft-primary', selected);
  pill.classList.toggle(PIN_SHADOW.rest, !selected && !hovered);
  pill.classList.toggle(PIN_SHADOW.hover, hovered);
  if (el.dataset.kind === 'clase') {
    pill.classList.toggle('bg-primary', selected);
    pill.classList.toggle('bg-neutral-900', hovered);
    pill.classList.toggle('bg-white', !selected && !hovered);
    pill.classList.toggle('text-white', selected || hovered);
    pill.classList.toggle('text-neutral-900', !selected && !hovered);
    tail?.classList.toggle('border-t-primary', selected);
    tail?.classList.toggle('border-t-neutral-900', hovered);
    tail?.classList.toggle('border-t-white', !selected && !hovered);
  }
}

export default function GoogleMap({
  pins,
  selectedPinId,
  hoveredPinId,
  userLocation,
  userLocationStatus,
  fallbackLocation,
  onLocateUser,
  onPinClick,
  onVisibleChange,
  onMapMoving,
  renderPopup,
  gestureHandling = 'greedy',
  className = 'w-full h-full',
  recenterTrigger,
  onUserDrag,
}: {
  pins: MapPin[];
  /** Externally-driven selection (e.g. clicking a row in a synced list) —
   * opens that pin's popup and pans the map to it, same as clicking the pin
   * directly. Omit for uncontrolled/no external sync (MapPreview's case). */
  selectedPinId?: string | null;
  /** Externally-driven hover (e.g. mousing over a row in a synced list) —
   * highlights that pin like a native hover, without panning or opening its
   * card. Independent of `selectedPinId`; a selected pin stays selected. */
  hoveredPinId?: string | null;
  /** User's current geolocation coordinates for rendering the user dot and proximity. */
  userLocation?: { lat: number; lng: number } | null;
  /** Status of user location request for button spinner / active state. */
  userLocationStatus?: 'idle' | 'prompting' | 'granted' | 'denied' | 'unavailable';
  /** Approximate fallback coordinates (e.g. from GeoIP on Vercel) when user has no GPS. */
  fallbackLocation?: { lat: number; lng: number } | null;
  /** Callback to trigger or re-request user geolocation. */
  onLocateUser?: () => void;
  onPinClick?: (id: string | null) => void;
  /** Fires whenever the visible viewport settles (pan/zoom/programmatic) with
   * the ids of pins currently inside it — for a "buscar al mover el mapa"
   * style list filter. The map itself never filters its own pins on this;
   * it's purely a report for the caller to act on. */
  onVisibleChange?: (visibleIds: Set<string>) => void;
  /** Fires when user starts dragging/zooming or map settles — allows parent to show skeleton/feedback. */
  onMapMoving?: (moving: boolean) => void;
  /** Fires when user finishes dragging/panning the map — allows unlinking fixed location filters. */
  onUserDrag?: () => void;
  /** Content for the card that opens above a pin when it's clicked. Omit to
   * disable the popup entirely (MapPreview's single-pin view has nothing
   * more to say than the label already shown below the map). */
  renderPopup?: (pinId: string, close: () => void) => React.ReactNode;
  /** 'greedy' allows single-finger map panning on mobile (for full map views).
   * 'cooperative' requires two fingers on mobile to avoid trapping page scroll (for embedded previews). */
  gestureHandling?: 'greedy' | 'cooperative' | 'none' | 'auto';
  className?: string;
  recenterTrigger?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const pinOverlaysRef = useRef<GoogleOverlayViewInstance[]>([]);
  const pinElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const overlayViewClassRef = useRef<(GoogleOverlayViewClass & { preventMapHitsAndGesturesFrom: (el: HTMLElement) => void }) | null>(null);
  const latLngClassRef = useRef<(new (lat: number, lng: number) => GoogleLatLng) | null>(null);
  const latLngBoundsClassRef = useRef<(new () => GoogleLatLngBoundsInstance) | null>(null);

  const onPinClickRef = useRef(onPinClick);
  useEffect(() => { onPinClickRef.current = onPinClick; }, [onPinClick]);
  const onVisibleChangeRef = useRef(onVisibleChange);
  useEffect(() => { onVisibleChangeRef.current = onVisibleChange; }, [onVisibleChange]);
  const onMapMovingRef = useRef(onMapMoving);
  useEffect(() => { onMapMovingRef.current = onMapMoving; }, [onMapMoving]);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [openPinId, setOpenPinId] = useState<string | null>(null);
  const openPinIdRef = useRef<string | null>(null);
  useEffect(() => { openPinIdRef.current = openPinId; }, [openPinId]);

  // Populated once the map finishes loading (see mount effect below);
  // `focusPin`/`recenter` only read through these refs so they stay stable
  // callbacks regardless of load timing — calls before load simply no-op.
  const pinsRef = useRef<MapPin[]>(pins);
  useEffect(() => { pinsRef.current = pins; }, [pins]);
  const recenterRef = useRef<(() => void) | null>(null);
  const prevPinsKeyRef = useRef<string>('');
  const skipNextRecenterRef = useRef(false);

  const onUserDragRef = useRef(onUserDrag);
  useEffect(() => { onUserDragRef.current = onUserDrag; }, [onUserDrag]);

  const onLocateUserRef = useRef(onLocateUser);
  useEffect(() => { onLocateUserRef.current = onLocateUser; }, [onLocateUser]);
  const userLocationRef = useRef(userLocation);
  useEffect(() => { userLocationRef.current = userLocation; }, [userLocation]);
  const fallbackLocationRef = useRef(fallbackLocation);
  useEffect(() => { fallbackLocationRef.current = fallbackLocation; }, [fallbackLocation]);
  const hasCenteredGpsRef = useRef(false);
  const hasCenteredFallbackRef = useRef(false);

  // Maximum distance (in km) to auto-expand framing around user location.
  // Beyond this threshold (e.g. nearest class > 8 km), the view won't zoom out
  // to extreme distances; instead it stays comfortably centered on the user at zoom 14.
  const MAX_NEARBY_FRAMING_KM = 8;

  // Frame location symmetrically around closest classes (up to MAX_NEARBY_FRAMING_KM),
  // or center directly at zoom 14 if classes are beyond that distance.
  const frameLocationWithNearbyPins = useCallback((
    center: { lat: number; lng: number },
    candidatePins: MapPin[],
    padding = 56
  ) => {
    const map = mapRef.current;
    const LatLngBounds = latLngBoundsClassRef.current;
    if (!map) return;

    const nearbyPins = candidatePins
      .map(p => ({
        pin: p,
        dist: calculateDistanceKm(center.lat, center.lng, p.lat, p.lng),
      }))
      .filter(item => item.dist <= MAX_NEARBY_FRAMING_KM)
      .sort((a, b) => a.dist - b.dist);

    if (nearbyPins.length > 0 && LatLngBounds) {
      const targetPins = nearbyPins.slice(0, 3);
      const minDelta = 0.0055;
      const maxLatDiff = Math.max(...targetPins.map(t => Math.abs(t.pin.lat - center.lat)), minDelta);
      const maxLngDiff = Math.max(...targetPins.map(t => Math.abs(t.pin.lng - center.lng)), minDelta);

      const bounds = new LatLngBounds();
      bounds.extend({ lat: center.lat - maxLatDiff, lng: center.lng - maxLngDiff });
      bounds.extend({ lat: center.lat + maxLatDiff, lng: center.lng + maxLngDiff });
      map.fitBounds(bounds, padding);
    } else {
      map.panTo({ lat: center.lat, lng: center.lng });
      map.setZoom(14);
    }
  }, []);

  // Auto-center on user GPS location with symmetric framing of closest classes when first detected
  useEffect(() => {
    if (!userLocation || !mapReady || !mapRef.current) return;
    if (!hasCenteredGpsRef.current) {
      hasCenteredGpsRef.current = true;
      frameLocationWithNearbyPins(userLocation, pins);
    }
  }, [userLocation, mapReady, pins, frameLocationWithNearbyPins]);

  // Initial center when using GeoIP fallback (no GPS yet)
  useEffect(() => {
    if (userLocation || !fallbackLocation || !mapReady || !mapRef.current) return;
    if (!hasCenteredFallbackRef.current) {
      hasCenteredFallbackRef.current = true;
      frameLocationWithNearbyPins(fallbackLocation, pins);
    }
  }, [userLocation, fallbackLocation, mapReady, pins, frameLocationWithNearbyPins]);

  const handleLocateUser = useCallback(() => {
    if (userLocation && mapRef.current) {
      frameLocationWithNearbyPins(userLocation, pinsRef.current);
    } else {
      onLocateUserRef.current?.();
    }
  }, [userLocation, frameLocationWithNearbyPins]);

  const focusPin = useCallback((id: string | null) => {
    setOpenPinId(id);
    if (!id) return;
    const pin = pinsRef.current.find(p => p.id === id);
    const map = mapRef.current;
    if (!pin || !map) return;
    map.panTo({ lat: pin.lat, lng: pin.lng });
  }, []);

  // Hover only re-styles pins directly (no pan, no card) — a selected pin
  // is left alone so hovering elsewhere in the list can't un-highlight it.
  const setHoveredPin = useCallback((id: string | null) => {
    pinElementsRef.current.forEach((el, pinId) => {
      if (pinId === openPinIdRef.current) return;
      applyPinState(el, pinId === id ? 'hover' : 'rest');
    });
  }, []);

  useEffect(() => {
    pinElementsRef.current.forEach((el, id) => applyPinState(el, id === openPinId ? 'selected' : 'rest'));
  }, [openPinId]);

  // Controlled selection from outside (e.g. ClasesMapView syncing a list
  // row) — same open+pan behavior as clicking the pin directly.
  useEffect(() => {
    if (selectedPinId === undefined) return;
    focusPin(selectedPinId);
  }, [selectedPinId, focusPin]);

  // Controlled hover from outside — same highlight as mousing over the pin.
  useEffect(() => {
    if (hoveredPinId === undefined) return;
    setHoveredPin(hoveredPinId);
  }, [hoveredPinId, setHoveredPin]);

  // Mount Google Maps instance once.
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    const prevAuthFailure = (window as unknown as { gm_authFailure?: () => void }).gm_authFailure;
    (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
      if (!cancelled) setError(true);
      if (typeof prevAuthFailure === 'function') prevAuthFailure();
    };

    (async () => {
      try {
        await loadGoogleMapsScript(GOOGLE_MAPS_API_KEY);
        if (cancelled || !window.google) return;
        const [{ Map, OverlayView }, coreLib] = await Promise.all([
          window.google.maps.importLibrary('maps') as Promise<GoogleMapsMapsLibrary>,
          window.google.maps.importLibrary('core') as Promise<GoogleMapsCoreLibrary>,
        ]);
        if (cancelled || !container) return;

        overlayViewClassRef.current = OverlayView;
        latLngClassRef.current = coreLib.LatLng;
        latLngBoundsClassRef.current = coreLib?.LatLngBounds || (window as unknown as { google?: { maps?: { LatLngBounds?: new () => GoogleLatLngBoundsInstance } } }).google?.maps?.LatLngBounds || null;

        const currentUserLoc = userLocationRef.current;
        const fallbackLoc = fallbackLocationRef.current;
        const initialCenter = currentUserLoc
          ? { lat: currentUserLoc.lat, lng: currentUserLoc.lng }
          : fallbackLoc
          ? { lat: fallbackLoc.lat, lng: fallbackLoc.lng }
          : pins[0]
          ? { lat: pins[0].lat, lng: pins[0].lng }
          : { lat: -12.046374, lng: -77.042793 };
        const map = new Map(container, {
          center: initialCenter,
          zoom: currentUserLoc || fallbackLoc ? 14 : 15,
          disableDefaultUI: true,
          zoomControl: false,
          gestureHandling,
          styles: MAP_STYLE,
        });
        mapRef.current = map;

        // Clicking empty map area closes whatever card is open — pins call
        // preventMapHitsAndGesturesFrom so their own clicks never reach this
        // listener; the card itself is a plain sibling div outside the map,
        // so clicks on it never reach the map at all.
        map.addListener('click', () => {
          if (cancelled) return;
          focusPin(null);
          onPinClickRef.current?.(null);
        });

        let isMoving = false;
        const notifyMoving = (moving: boolean) => {
          if (isMoving === moving) return;
          isMoving = moving;
          onMapMovingRef.current?.(moving);
        };

        // Track when camera starts moving (pan/zoom) to trigger feedback/skeleton
        map.addListener('dragstart', () => {
          if (cancelled) return;
          notifyMoving(true);
        });

        map.addListener('dragend', () => {
          if (cancelled) return;
          skipNextRecenterRef.current = true;
          onUserDragRef.current?.();
        });

        map.addListener('zoom_changed', () => {
          if (cancelled) return;
          notifyMoving(true);
        });

        // Reports which pins are currently inside the viewport — fires after
        // any pan/zoom settles, programmatic or user-driven (recenter,
        // selecting a pin, dragging, scroll-zoom). Purely informational; see
        // `onVisibleChange` doc comment for why filtering isn't done here.
        map.addListener('idle', () => {
          if (cancelled) return;
          notifyMoving(false);
          if (!onVisibleChangeRef.current) return;
          const bounds = map.getBounds?.();
          if (!bounds) return;
          const visible = new Set(pinsRef.current.filter(p => bounds.contains({ lat: p.lat, lng: p.lng })).map(p => p.id));
          onVisibleChangeRef.current(visible);
        });

        if (!cancelled) {
          setMapReady(true);
          setLoaded(true);
        }
      } catch (err) {
        console.error('[GoogleMap] init failed', err);
        if (!cancelled) setError(true);
      }
    })();

    const pinOverlays = pinOverlaysRef.current;
    const pinElements = pinElementsRef.current;

    return () => {
      cancelled = true;
      (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = prevAuthFailure;
      pinOverlays.forEach(o => o.setMap(null));
      pinOverlaysRef.current = [];
      pinElements.clear();
      recenterRef.current = null;
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync pin overlays whenever map is ready or pins change (e.g. live filter changes).
  // Uses a single unified PinsOverlay with GPU translate3d and cached LatLng objects for 60fps zoom.
  useEffect(() => {
    const map = mapRef.current;
    const OverlayView = overlayViewClassRef.current;
    const LatLng = latLngClassRef.current;
    if (!mapReady || !map || !OverlayView || !LatLng) return;

    // Clear previous overlays
    pinOverlaysRef.current.forEach(o => o.setMap(null));
    pinOverlaysRef.current = [];
    pinElementsRef.current.clear();

    if (pins.length === 0 && !userLocation && !fallbackLocation) {
      if (openPinIdRef.current) {
        setOpenPinId(null);
        onPinClickRef.current?.(null);
      }
      return;
    }

    const recenter = () => {
      if (!mapReady || !mapRef.current) return;
      const map = mapRef.current;
      const LatLngBoundsClass = latLngBoundsClassRef.current;

      if (pins.length === 0) {
        const activeLocation = userLocation || fallbackLocation;
        if (activeLocation) {
          map.panTo({ lat: activeLocation.lat, lng: activeLocation.lng });
          map.setZoom(14);
        }
        return;
      }

      if (pins.length === 1 || !LatLngBoundsClass) {
        map.panTo({ lat: pins[0].lat, lng: pins[0].lng });
        map.setZoom(15);
        return;
      }

      // Anti-world-map clustering:
      // Group pins into geographic clusters (50 km proximity threshold)
      const clusters: MapPin[][] = [];
      for (const pin of pins) {
        let placed = false;
        for (const cluster of clusters) {
          if (cluster.some(c => calculateDistanceKm(c.lat, c.lng, pin.lat, pin.lng) <= 50)) {
            cluster.push(pin);
            placed = true;
            break;
          }
        }
        if (!placed) {
          clusters.push([pin]);
        }
      }

      // Pick target cluster: closest to current map center or the largest
      let targetCluster = clusters[0];
      if (clusters.length > 1) {
        const currentCenterLatLng = map.getCenter?.();
        if (currentCenterLatLng) {
          const currentCenter = { lat: currentCenterLatLng.lat(), lng: currentCenterLatLng.lng() };
          let minDist = Infinity;
          for (const cluster of clusters) {
            const dist = Math.min(...cluster.map(p => calculateDistanceKm(currentCenter.lat, currentCenter.lng, p.lat, p.lng)));
            if (dist < minDist) {
              minDist = dist;
              targetCluster = cluster;
            }
          }
        } else {
          targetCluster = clusters.sort((a, b) => b.length - a.length)[0];
        }
      }

      if (targetCluster.length === 1) {
        map.panTo({ lat: targetCluster[0].lat, lng: targetCluster[0].lng });
        map.setZoom(15);
      } else {
        const bounds = new LatLngBoundsClass();
        targetCluster.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
        map.fitBounds(bounds, 48);

        // Prevent over-zooming if all pins in cluster are at the exact same venue
        let hasAdjustedZoom = false;
        map.addListener('idle', () => {
          if (hasAdjustedZoom) return;
          hasAdjustedZoom = true;
          const zoom = map.getZoom?.();
          if (zoom && zoom > 16) {
            map.setZoom(16);
          }
        });
      }
    };
    recenterRef.current = recenter;

    // When the pins set changes (e.g. user selected a location or filter),
    // automatically re-frame the map camera to show the matching results,
    // unless the change was triggered by the user dragging the map.
    const pinsKey = pins.map(p => p.id).sort().join(',');
    if (prevPinsKeyRef.current && prevPinsKeyRef.current !== pinsKey) {
      if (skipNextRecenterRef.current) {
        skipNextRecenterRef.current = false;
      } else {
        recenter();
      }
    }
    prevPinsKeyRef.current = pinsKey;

    // If currently open pin is no longer in pins, close popup
    if (openPinIdRef.current && !pins.some(p => p.id === openPinIdRef.current)) {
      setOpenPinId(null);
      onPinClickRef.current?.(null);
    }
  }, [pins, userLocation, fallbackLocation, mapReady, frameLocationWithNearbyPins]);

  // External recenter trigger (e.g. user re-clicked a location in search to refresh)
  useEffect(() => {
    if (recenterTrigger && recenterRef.current) {
      setOpenPinId(null);
      onPinClickRef.current?.(null);
      recenterRef.current();
    }
  }, [recenterTrigger]);

  useEffect(() => {
    const map = mapRef.current;
    const OverlayView = overlayViewClassRef.current;
    const LatLng = latLngClassRef.current;
    if (!mapReady || !map || !OverlayView || !LatLng) return;
    const overlayViewClass = OverlayView;
    const latLngClass = LatLng;

    // Pre-instantiate and cache LatLng instances to prevent garbage collection pauses during zoom
    const latLngMap = new Map<string, GoogleLatLng>();
    const pinElements = pinElementsRef.current;
    pins.forEach(pin => {
      latLngMap.set(pin.id, new LatLng(pin.lat, pin.lng));
      const pinDiv = buildPinElement(pin);
      pinElements.set(pin.id, pinDiv);
      if (pin.title) pinDiv.title = pin.title;
      pinDiv.addEventListener('click', e => {
        e.stopPropagation();
        const next = openPinIdRef.current === pin.id ? null : pin.id;
        pinElementsRef.current.forEach((el, id) => applyPinState(el, id === next ? 'selected' : 'rest'));
        focusPin(next);
        onPinClickRef.current?.(next);
      });
      pinDiv.addEventListener('mouseenter', () => {
        if (openPinIdRef.current !== pin.id) applyPinState(pinDiv, 'hover');
      });
      pinDiv.addEventListener('mouseleave', () => {
        applyPinState(pinDiv, openPinIdRef.current === pin.id ? 'selected' : 'rest');
      });
    });

    let userLocationElement: HTMLDivElement | null = null;
    let userLatLng: GoogleLatLng | null = null;
    if (userLocation) {
      userLatLng = new latLngClass(userLocation.lat, userLocation.lng);
      userLocationElement = buildUserLocationElement();
    }

    class PinsOverlay extends (overlayViewClass as unknown as { new(): GoogleOverlayViewInstance }) {
      private container: HTMLDivElement | null = null;

      onAdd() {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.pointerEvents = 'none';
        container.style.willChange = 'transform';
        this.container = container;

        this.getPanes().overlayMouseTarget.appendChild(container);

        pinElements.forEach(pinDiv => {
          overlayViewClass.preventMapHitsAndGesturesFrom(pinDiv);
          container.appendChild(pinDiv);
        });

        if (userLocationElement) {
          overlayViewClass.preventMapHitsAndGesturesFrom(userLocationElement);
          container.appendChild(userLocationElement);
        }
      }

      draw() {
        const projection = this.getProjection();
        if (!projection) return;

        pins.forEach(pin => {
          const pinDiv = pinElements.get(pin.id);
          const latLng = latLngMap.get(pin.id);
          if (!pinDiv || !latLng) return;
          const pos = projection.fromLatLngToDivPixel(latLng);
          if (pos) {
            pinDiv.style.transform = `translate3d(${Math.round(pos.x)}px, ${Math.round(pos.y)}px, 0)`;
          }
        });

        if (userLocationElement && userLatLng) {
          const pos = projection.fromLatLngToDivPixel(userLatLng);
          if (pos) {
            userLocationElement.style.transform = `translate3d(${Math.round(pos.x)}px, ${Math.round(pos.y)}px, 0)`;
          }
        }
      }

      onRemove() {
        if (this.container) {
          this.container.parentNode?.removeChild(this.container);
          this.container = null;
        }
      }
    }

    const overlay = new PinsOverlay();
    overlay.setMap(map);
    pinOverlaysRef.current = [overlay];

    pinElements.forEach((el, id) => applyPinState(el, id === openPinIdRef.current ? 'selected' : 'rest'));

    // Refresh visible pins for the current viewport after new pin overlays mount
    if (onVisibleChangeRef.current && map) {
      const bounds = map.getBounds?.();
      if (bounds) {
        const visible = new Set(pins.filter(p => bounds.contains({ lat: p.lat, lng: p.lng })).map(p => p.id));
        onVisibleChangeRef.current(visible);
      }
    }

    return () => {
      pinOverlaysRef.current.forEach(o => o.setMap(null));
      pinOverlaysRef.current = [];
      pinElements.clear();
    };
  }, [mapReady, pins, focusPin, userLocation]);

  if (error || !GOOGLE_MAPS_API_KEY) {
    return (
      <div className={`${className} flex items-center justify-center bg-neutral-100 text-[13px] text-neutral-400`}>
        No se pudo cargar el mapa
      </div>
    );
  }

  const zoomBy = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom((map.getZoom() ?? 15) + delta);
  };

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 pointer-events-none">
          <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
        </div>
      )}
      {loaded && (
        <div className="absolute right-4 top-4 z-10 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => zoomBy(1)}
            aria-label="Acercar"
            className="w-9 h-9 rounded-btn border border-neutral-900 bg-white flex items-center justify-center hover:bg-neutral-100 active:scale-95 transition-[background-color,transform]"
          >
            <Plus className="w-4 h-4 text-neutral-900" />
          </button>
          <button
            type="button"
            onClick={() => zoomBy(-1)}
            aria-label="Alejar"
            className="w-9 h-9 rounded-btn border border-neutral-900 bg-white flex items-center justify-center hover:bg-neutral-100 active:scale-95 transition-[background-color,transform]"
          >
            <Minus className="w-4 h-4 text-neutral-900" />
          </button>
          <button
            type="button"
            onClick={handleLocateUser}
            aria-label="Mi ubicación"
            title={userLocation ? 'Ir a mi ubicación' : 'Activar mi ubicación'}
            disabled={userLocationStatus === 'prompting'}
            className={`w-9 h-9 mt-1 rounded-btn border flex items-center justify-center active:scale-95 transition-[background-color,transform,border-color,color] ${
              userLocation
                ? 'border-blue-600 bg-white text-blue-600 hover:bg-blue-50 shadow-sm'
                : 'border-neutral-900 bg-white text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            {userLocationStatus === 'prompting' ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <Navigation className={`w-4 h-4 ${userLocation ? 'fill-blue-600' : ''}`} />
            )}
          </button>
          <button
            type="button"
            onClick={() => recenterRef.current?.()}
            aria-label="Centrar mapa"
            title="Centrar mapa"
            className="w-9 h-9 rounded-btn border border-neutral-900 bg-white flex items-center justify-center hover:bg-neutral-100 active:scale-95 transition-[background-color,transform]"
          >
            <LocateFixed className="w-4 h-4 text-neutral-900" />
          </button>
        </div>
      )}
      {openPinId && renderPopup && (
        // `bottom-20` on mobile clears ClasesMapView's floating "Ver lista"/
        // "Ver mapa" toggle (also bottom-anchored, centered, same z-index) —
        // without it the card's own footer link sits right behind that
        // button and becomes untappable. Desktop has no such toggle, so
        // `lg:bottom-4` matches the tighter desktop spacing again there.
        <div className="absolute bottom-20 lg:bottom-4 left-1/2 -translate-x-1/2 z-10 w-96 max-w-[calc(100%-2rem)] bg-white rounded-xl border border-neutral-900 shadow-2xl overflow-hidden">
          {renderPopup(openPinId, () => { focusPin(null); onPinClickRef.current?.(null); })}
        </div>
      )}
    </div>
  );
}
