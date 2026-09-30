-- 61_sanitize_social_handles.sql
-- Sanitiza valores existentes de instagram y tiktok en la tabla profiles,
-- extrayendo handles limpios y eliminando URLs completas, parámetros de tracking,
-- espacios y caracteres redundantes de forma general para cualquier perfil.

-- 1. Limpieza general de URLs de Instagram
-- Remueve cualquier protocolo/dominio hasta 'instagram.com/', query params (?...) o hashes (#...),
-- slashes residuales y @ redundantes.
UPDATE public.profiles
SET instagram = regexp_replace(
  regexp_replace(
    regexp_replace(instagram, '^.*instagram\.com\/', '', 'i'),
    '[\?#].*$', '', 'g'
  ),
  '^\/+|\/+$|^@+', '', 'g'
)
WHERE instagram IS NOT NULL
  AND (instagram ILIKE '%instagram.com%' OR instagram ILIKE 'http%');

-- 2. Limpieza general de URLs de TikTok
-- Remueve cualquier protocolo/dominio hasta 'tiktok.com/', query params (?...) o hashes (#...),
-- slashes residuales y @ redundantes.
UPDATE public.profiles
SET tiktok = regexp_replace(
  regexp_replace(
    regexp_replace(tiktok, '^.*tiktok\.com\/', '', 'i'),
    '[\?#].*$', '', 'g'
  ),
  '^\/+|\/+$|^@+', '', 'g'
)
WHERE tiktok IS NOT NULL
  AND (tiktok ILIKE '%tiktok.com%' OR tiktok ILIKE 'http%');

-- 3. Limpieza de @ iniciales y espacios en blanco residuales para cualquier perfil
UPDATE public.profiles
SET instagram = NULLIF(regexp_replace(trim(instagram), '^@+', '', 'g'), '')
WHERE instagram IS NOT NULL
  AND (instagram LIKE '@%' OR instagram LIKE ' %' OR instagram LIKE '% ');

UPDATE public.profiles
SET tiktok = NULLIF(regexp_replace(trim(tiktok), '^@+', '', 'g'), '')
WHERE tiktok IS NOT NULL
  AND (tiktok LIKE '@%' OR tiktok LIKE ' %' OR tiktok LIKE '% ');
