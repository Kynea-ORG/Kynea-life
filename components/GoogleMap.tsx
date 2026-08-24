'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Plus, Minus, LocateFixed } from 'lucide-react';
import { loadGoogleMapsScript } from './PlacesAddressField';
import { MAP_STYLE } from '@/lib/maps/mapStyle';

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
  wrapper.style.cursor = 'pointer';
  wrapper.style.pointerEvents = 'auto';
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
  onPinClick,
  onVisibleChange,
  onMapMoving,
  renderPopup,
  gestureHandling = 'greedy',
  className = 'w-full h-full',
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
  onPinClick?: (id: string | null) => void;
  /** Fires whenever the visible viewport settles (pan/zoom/programmatic) with
   * the ids of pins currently inside it — for a "buscar al mover el mapa"
   * style list filter. The map itself never filters its own pins on this;
   * it's purely a report for the caller to act on. */
  onVisibleChange?: (visibleIds: Set<string>) => void;
  /** Fires when user starts dragging/zooming or map settles — allows parent to show skeleton/feedback. */
  onMapMoving?: (moving: boolean) => void;
  /** Content for the card that opens above a pin when it's clicked. Omit to
   * disable the popup entirely (MapPreview's single-pin view has nothing
   * more to say than the label already shown below the map). */
  renderPopup?: (pinId: string, close: () => void) => React.ReactNode;
  /** 'greedy' allows single-finger map panning on mobile (for full map views).
   * 'cooperative' requires two fingers on mobile to avoid trapping page scroll (for embedded previews). */
  gestureHandling?: 'greedy' | 'cooperative' | 'none' | 'auto';
  className?: string;
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

        const initialCenter = pins[0] ? { lat: pins[0].lat, lng: pins[0].lng } : { lat: -12.046374, lng: -77.042793 };
        const map = new Map(container, {
          center: initialCenter,
          zoom: 15,
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

        // Track when camera starts moving (pan/zoom) to trigger feedback/skeleton
        map.addListener('dragstart', () => {
          if (cancelled) return;
          onMapMovingRef.current?.(true);
        });

        map.addListener('zoom_changed', () => {
          if (cancelled) return;
          onMapMovingRef.current?.(true);
        });

        // Reports which pins are currently inside the viewport — fires after
        // any pan/zoom settles, programmatic or user-driven (recenter,
        // selecting a pin, dragging, scroll-zoom). Purely informational; see
        // `onVisibleChange` doc comment for why filtering isn't done here.
        map.addListener('idle', () => {
          if (cancelled) return;
          onMapMovingRef.current?.(false);
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
  // Uses a single unified PinsOverlay to batch DOM operations for high performance with 100+ pins.
  useEffect(() => {
    const map = mapRef.current;
    const OverlayView = overlayViewClassRef.current;
    const LatLng = latLngClassRef.current;
    const LatLngBoundsClass = latLngBoundsClassRef.current;
    if (!mapReady || !map || !OverlayView || !LatLng) return;

    // Clear previous overlays
    pinOverlaysRef.current.forEach(o => o.setMap(null));
    pinOverlaysRef.current = [];
    pinElementsRef.current.clear();

    if (pins.length === 0) {
      if (openPinIdRef.current) {
        setOpenPinId(null);
        onPinClickRef.current?.(null);
      }
      return;
    }

    const recenter = () => {
      if (pins.length === 1 || !LatLngBoundsClass) {
        map.setCenter({ lat: pins[0].lat, lng: pins[0].lng });
      } else {
        const bounds = new LatLngBoundsClass();
        pins.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
        map.fitBounds(bounds, 48);
      }
    };
    recenterRef.current = recenter;

    // If currently open pin is no longer in pins, close popup
    if (openPinIdRef.current && !pins.some(p => p.id === openPinIdRef.current)) {
      setOpenPinId(null);
      onPinClickRef.current?.(null);
    }

    const overlayViewClass = OverlayView;
    const latLngClass = LatLng;

    const pinElements = pinElementsRef.current;
    pins.forEach(pin => {
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
        this.container = container;

        this.getPanes().overlayMouseTarget.appendChild(container);

        pinElements.forEach(pinDiv => {
          overlayViewClass.preventMapHitsAndGesturesFrom(pinDiv);
          container.appendChild(pinDiv);
        });
      }

      draw() {
        const projection = this.getProjection();
        if (!projection) return;

        pins.forEach(pin => {
          const pinDiv = pinElements.get(pin.id);
          if (!pinDiv) return;
          const pos = projection.fromLatLngToDivPixel(new latLngClass(pin.lat, pin.lng));
          if (pos) {
            pinDiv.style.left = `${pos.x}px`;
            pinDiv.style.top = `${pos.y}px`;
          }
        });
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

    return () => {
      pinOverlaysRef.current.forEach(o => o.setMap(null));
      pinOverlaysRef.current = [];
      pinElements.clear();
    };
  }, [mapReady, pins, focusPin]);

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
            onClick={() => recenterRef.current?.()}
            aria-label="Centrar mapa"
            className="w-9 h-9 mt-1 rounded-btn border border-neutral-900 bg-white flex items-center justify-center hover:bg-neutral-100 active:scale-95 transition-[background-color,transform]"
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
