-- 55. BLOG POST VIEW COUNTER — blog_posts.views_count existe desde la
-- migración 49 pero nunca se incrementó en ningún lado del código, mismo
-- bug exacto que resolvió la 46 para classes/profiles. RPC idéntico, mismo
-- patrón: SECURITY DEFINER para que un visitante anónimo pueda incrementarlo
-- sin necesitar permiso de UPDATE directo sobre la tabla, y solo cuenta
-- contra un post realmente publicado (una vista de un borrador en modo
-- preview no infla el contador).
CREATE OR REPLACE FUNCTION public.increment_blog_post_views(target_post_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  UPDATE public.blog_posts
  SET views_count = views_count + 1
  WHERE id = target_post_id AND status = 'published';
$$;

GRANT EXECUTE ON FUNCTION public.increment_blog_post_views(uuid) TO anon, authenticated;
