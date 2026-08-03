import { fetchPublishedClasses } from '@/lib/classes/queries';
import { fetchFeaturedProfiles } from '@/lib/profiles/queries';
import { fetchDanceStyles } from '@/lib/catalog/queries';
import { fetchHomeStats } from '@/lib/stats/queries';
import HomeClient from './HomeClient';
import AuthErrorBanner from '@/components/AuthErrorBanner';

// Un estilo con más de este número de clases publicadas (como estilo
// principal o secundario) se gana su propia fila destacada en el Home —
// dinámico según el catálogo real, en vez de una lista fija a mano.
const MIN_CLASSES_FOR_FEATURED_ROW = 4;

export default async function Page() {
  const [classes, teachers, academias, danceStyles, stats] = await Promise.all([
    fetchPublishedClasses(),
    fetchFeaturedProfiles('profesor', 6),
    fetchFeaturedProfiles('academia', 4),
    fetchDanceStyles(),
    fetchHomeStats(),
  ]);

  const classesByStyle = new Map<string, typeof classes>();
  for (const cls of classes) {
    for (const style of [cls.style, ...(cls.secondaryStyles ?? [])]) {
      if (!style) continue;
      const existing = classesByStyle.get(style);
      if (existing) existing.push(cls);
      else classesByStyle.set(style, [cls]);
    }
  }

  const featuredCategories = [...classesByStyle.entries()]
    .filter(([, styleClasses]) => styleClasses.length > MIN_CLASSES_FOR_FEATURED_ROW)
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([style, styleClasses]) => ({ style, classes: styleClasses }));

  return (
    <>
      <AuthErrorBanner />
      <HomeClient
        initialClasses={classes}
        featuredCategories={featuredCategories}
        initialTeachers={teachers}
        initialAcademias={academias}
        danceStyles={danceStyles}
        stats={stats}
      />
    </>
  );
}
