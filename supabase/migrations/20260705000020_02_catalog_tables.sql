-- ── 2. CATÁLOGOS ────────────────────────────────────────────────────────────
-- Tablas de solo lectura desde el cliente. Escritura solo via SQL admin.

-- Estilos de danza
CREATE TABLE public.dance_styles (
  id    smallserial PRIMARY KEY,
  name  text        UNIQUE NOT NULL,
  slug  text        UNIQUE NOT NULL,
  emoji text,
  ord   smallint    NOT NULL DEFAULT 0
);

-- Niveles de clase
CREATE TABLE public.class_levels (
  id   smallserial PRIMARY KEY,
  name text        UNIQUE NOT NULL,
  ord  smallint    NOT NULL DEFAULT 0
);

-- Distritos del Perú (la ciudad se obtiene por JOIN en lugar de duplicar el campo)
CREATE TABLE public.districts (
  id   smallserial PRIMARY KEY,
  name text        NOT NULL,
  city text        NOT NULL DEFAULT 'Lima',
  UNIQUE (name, city)
);
