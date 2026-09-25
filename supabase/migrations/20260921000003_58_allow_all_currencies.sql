-- 58_allow_all_currencies.sql
-- Permitir todas las monedas ISO 4217 (código de 3 letras mayúsculas) en classes.currency

ALTER TABLE public.classes
  DROP CONSTRAINT IF EXISTS classes_currency_check;

ALTER TABLE public.classes
  ADD CONSTRAINT classes_currency_check
  CHECK (currency ~ '^[A-Z]{3}$');
