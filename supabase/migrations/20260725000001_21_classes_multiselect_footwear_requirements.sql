-- 21. CLASSES — calzado recomendado y requisitos previos pasan a multi-select
-- footwear/requirements eran texto libre de opción única; el wizard ahora
-- permite elegir varias opciones, así que la columna pasa a array. Las filas
-- existentes con un solo valor se envuelven en un array de un elemento.

ALTER TABLE public.classes
  ALTER COLUMN footwear TYPE text[] USING CASE WHEN footwear IS NULL THEN NULL ELSE ARRAY[footwear] END,
  ALTER COLUMN requirements TYPE text[] USING CASE WHEN requirements IS NULL THEN NULL ELSE ARRAY[requirements] END;
