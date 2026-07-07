-- ── 4. LOCALES ──────────────────────────────────────────────────────────────
-- Locales físicos reutilizables. Un profesor puede tener varios locales
-- y asignarlos a distintas clases sin repetir la dirección.

CREATE TABLE public.venues (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  address     text,
  reference   text,
  district_id smallint    REFERENCES public.districts(id),
  maps_url    text,
  lat         double precision,
  lng         double precision,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
