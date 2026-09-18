-- ── 53. BLOG SCHEDULED PUBLISH ────────────────────────────────────────────
-- Antes solo existían "borrador" o "publicado ahora" — no había forma de
-- dejar un post listo y que salga solo a una fecha/hora futura. scheduled_at
-- vive en un borrador (status='draft') y un cron externo
-- (app/api/cron/publish-scheduled-posts) lo pasa a 'published' cuando
-- corresponde — ver ese route handler y lib/blog/actions.ts:publishDuePosts()
-- para la otra mitad de este mecanismo.
ALTER TABLE public.blog_posts
  ADD COLUMN scheduled_at timestamptz;

CREATE INDEX blog_posts_scheduled_at_idx ON public.blog_posts (scheduled_at)
  WHERE status = 'draft' AND scheduled_at IS NOT NULL;
