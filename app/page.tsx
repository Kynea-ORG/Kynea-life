import { fetchPublishedClasses } from '@/lib/classes/queries';
import { fetchFeaturedProfiles } from '@/lib/profiles/queries';
import { fetchDanceStyles } from '@/lib/catalog/queries';
import { fetchHomeStats } from '@/lib/stats/queries';
import HomeClient from './HomeClient';
import AuthErrorBanner from '@/components/AuthErrorBanner';

// Style rows featured on Home below "Clases esta semana", in display order.
// Picked for having several published classes from different teachers —
// revisit this list as the catalog grows instead of hardcoding forever.
const FEATURED_STYLES = ['Heels', 'Contemporáneo'];

export default async function Page() {
  const [classes, featuredStyleClasses, teachers, academias, danceStyles, stats] = await Promise.all([
    fetchPublishedClasses(),
    Promise.all(FEATURED_STYLES.map(style => fetchPublishedClasses({ styles: [style] }))),
    fetchFeaturedProfiles('profesor', 6),
    fetchFeaturedProfiles('academia'),
    fetchDanceStyles(),
    fetchHomeStats(),
  ]);

  const featuredCategories = FEATURED_STYLES.map((style, i) => ({
    style,
    classes: featuredStyleClasses[i],
  }));

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
