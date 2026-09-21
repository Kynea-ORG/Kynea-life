import { SITE_URL } from '@/lib/constants';
import { fetchPublishedPosts } from '@/lib/blog/queries';
import { publishedDateIso, BLOG_DESCRIPTION } from '@/lib/blog/helpers';

// Feed RSS 2.0 del blog — descubrimiento/syndication (un lector RSS, un
// agregador, o Google Discover pueden usarlo) y referenciado desde
// app/blog/page.tsx vía metadata.alternates.types. No usa el cliente de
// Supabase autenticado ni cookies — mismo fetchPublishedPosts() cacheado que
// ya usa /blog, así que este endpoint es tan barato como cualquier página
// pública del catálogo.
export const revalidate = 300;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const posts = await fetchPublishedPosts();

  const items = posts
    .map(post => {
      const url = `${SITE_URL}/blog/${post.slug}`;
      const iso = publishedDateIso(post);
      const parsed = iso ? new Date(iso) : null;
      const pubDate = parsed && !isNaN(parsed.getTime()) ? parsed.toUTCString() : undefined;
      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ''}
      ${post.category ? `<category>${escapeXml(post.category)}</category>` : ''}
      <description>${escapeXml(post.excerpt || '')}</description>
    </item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Blog de Kynea</title>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(BLOG_DESCRIPTION)}</description>
    <language>es-PE</language>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}
