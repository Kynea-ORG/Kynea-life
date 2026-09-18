-- ── 51. BLOG FEATURED ─────────────────────────────────────────────────────
-- Antes el "destacado" del home del blog era implícito: siempre el post
-- publicado más reciente, sin ningún control editorial. Un admin no podía
-- mantener un post más viejo en el lugar más visible aunque fuera el mejor
-- para ese momento (una campaña, una guía evergreen, etc.). Este flag lo
-- hace explícito — el índice prioriza el primero marcado is_featured=true
-- (por published_at DESC si hay varios) y solo cae al más reciente si
-- ninguno está marcado, preservando el comportamiento actual por default.
ALTER TABLE public.blog_posts
  ADD COLUMN is_featured boolean NOT NULL DEFAULT false;
