import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';
import { fetchPublishedClasses } from '@/lib/classes/queries';
import { classUrl } from '@/lib/classes/helpers';
import { fetchFeaturedProfiles } from '@/lib/profiles/queries';

const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '',                       changeFrequency: 'daily',   priority: 1 },
  { path: '/clases',                changeFrequency: 'daily',   priority: 0.9 },
  { path: '/profesores',            changeFrequency: 'daily',   priority: 0.8 },
  { path: '/academias',             changeFrequency: 'daily',   priority: 0.8 },
  { path: '/mapa',                  changeFrequency: 'weekly',  priority: 0.6 },
  { path: '/unete',                 changeFrequency: 'monthly', priority: 0.7 },
  { path: '/terminos',              changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/terminos-publicacion',  changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/privacidad',            changeFrequency: 'yearly',  priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // fetchFeaturedProfiles(role) with no limit returns every profile with that
  // role — same call the public /profesores directory uses to list everyone.
  const [classes, profesores, academias] = await Promise.all([
    fetchPublishedClasses(),
    fetchFeaturedProfiles('profesor'),
    fetchFeaturedProfiles('academia'),
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

  return [...staticEntries, ...classEntries, ...profileEntries];
}
