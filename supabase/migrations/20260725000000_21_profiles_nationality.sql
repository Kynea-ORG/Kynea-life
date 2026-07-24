-- 21. PROFILES — nacionalidad
-- Reemplaza la captura de ciudad/distrito en el onboarding: se pide la
-- nacionalidad del profesor/academia en su lugar. Nullable porque los
-- perfiles existentes no la tienen (no hay backfill posible).

ALTER TABLE public.profiles ADD COLUMN nationality text;
