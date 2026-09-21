-- ── 50. BLOG ACCENT COLOR ─────────────────────────────────────────────────
-- "Bloque de color" de portada por artículo (referencia: The Verge, que le
-- da a cada feature story su propio color de fondo) — antes todos los posts
-- compartían la misma cabecera blanca sin distinción visual entre ellos.
-- Se guarda como key de una paleta curada (BLOG_ACCENTS en
-- lib/blog/helpers.ts), no como hex libre: el CHECK evita que un insert/
-- update directo a la tabla (fuera del form de admin) deje una key que el
-- front no sepa mapear.
ALTER TABLE public.blog_posts
  ADD COLUMN accent_color text
    CHECK (accent_color IS NULL OR accent_color IN ('yellow', 'sky', 'lilac', 'mint', 'coral', 'grape', 'ink'));
