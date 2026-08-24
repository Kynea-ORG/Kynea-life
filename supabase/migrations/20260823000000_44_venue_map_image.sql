-- ── 44. IMAGEN DE MAPA CACHEADA POR LOCAL ──────────────────────────────────
-- Snapshot estático (Static Maps API) generado una sola vez cuando se fija
-- lat/lng del local (ver findOrCreateVenue en lib/classes/helpers.ts) y
-- subido a Storage (bucket class-images) — el preview de "Ubicación" en el
-- detalle de clase (MapPreview.tsx) sirve esta imagen en vez de llamar a
-- Google en cada visita; el mapa interactivo real solo se carga si el
-- usuario hace clic ahí.

ALTER TABLE public.venues
  ADD COLUMN map_image_url text;
