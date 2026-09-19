import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';
import { fetchPublishedClasses } from '@/lib/classes/queries';
import { classUrl } from '@/lib/classes/helpers';
import { fetchFeaturedProfiles } from '@/lib/profiles/queries';
import { fetchPublishedPosts } from '@/lib/blog/queries';
import { fetchDanceStyles, fetchStyleClassCounts } from '@/lib/catalog/queries';

const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '',                       changeFrequency: 'daily',   priority: 1 },
  { path: '/clases',                changeFrequency: 'daily',   priority: 0.9 },
  { path: '/categorias',            changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/profesores',            changeFrequency: 'daily',   priority: 0.8 },
  { path: '/academias',             changeFrequency: 'daily',   priority: 0.8 },
  { path: '/mapa',                  changeFrequency: 'weekly',  priority: 0.6 },
  { path: '/blog',                  changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/profesores/unete',      changeFrequency: 'monthly', priority: 0.7 },
  { path: '/academias/unete',       changeFrequency: 'monthly', priority: 0.7 },
  { path: '/unete',                 changeFrequency: 'monthly', priority: 0.7 },
  { path: '/terminos',              changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/terminos-publicacion',  changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/privacidad',            changeFrequency: 'yearly',  priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // fetchFeaturedProfiles(role) with no limit returns every profile with that
  // role — same call the public /profesores directory uses to list everyone.
  const [classes, profesores, academias, posts, danceStyles, styleCounts] = await Promise.all([
    fetchPublishedClasses(),
    fetchFeaturedProfiles('profesor'),
    fetchFeaturedProfiles('academia'),
    fetchPublishedPosts(),
    fetchDanceStyles(),
    fetchStyleClassCounts(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency,
    priority,
  }));

  const classEntries: MetadataRoute.Sitemap = classes.map(cls => ({
    url: `${SITE_URL}${classUrl(cls)}`,
    lastModified: cls.publishedAt || cls.createdAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const profileEntries: MetadataRoute.Sitemap = [
    ...profesores.map(t => ({
      url: `${SITE_URL}/profesores/${t.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...academias.map(t => ({
      url: `${SITE_URL}/academias/${t.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];

  const postEntries: MetadataRoute.Sitemap = posts.map(post => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.updatedAt || post.publishedAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  // Solo estilos con al menos una clase publicada: generateMetadata() de
  // /categorias/[slug] marca noindex a las categorías vacías (ver ese
  // archivo), así que listarlas igual acá generaría el error de Search
  // Console "URL enviada marcada como noindex".
  const categoryEntries: MetadataRoute.Sitemap = danceStyles
    .filter(s => (styleCounts[s.id] ?? 0) > 0)
    .map(s => ({
      url: `${SITE_URL}/categorias/${s.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

  return [...staticEntries, ...classEntries, ...profileEntries, ...postEntries, ...categoryEntries];
}
