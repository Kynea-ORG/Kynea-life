-- 48. VENUES — país
-- Inferido de la dirección real de la clase (componente 'country' de Google
-- Places, código ISO 3166-1 alpha-2), no de la nacionalidad del profesor/
-- academia — un profesor extranjero puede dictar clases en Perú, y ese caso
-- no debe marcarse como "clase de otro país". Default 'PE': todo el catálogo
-- actual es de Perú y el fallback de dirección manual (sin Google Maps) no
-- tiene forma de determinar el país.

ALTER TABLE public.venues ADD COLUMN country_code text NOT NULL DEFAULT 'PE';
