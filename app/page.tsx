import { fetchPublishedClasses } from '@/lib/classes/queries';
import { fetchFeaturedProfiles } from '@/lib/profiles/queries';
import { fetchDanceStyles } from '@/lib/catalog/queries';
import { fetchHomeStats } from '@/lib/stats/queries';
import HomeClient from './HomeClient';
import AuthErrorBanner from '@/components/AuthErrorBanner';

export default async function Page() {
  const [classes, salsaClasses, teachers, academias, danceStyles, stats] = await Promise.all([
    fetchPublishedClasses(),
    fetchPublishedClasses({ styles: ['Salsa'] }),
    fetchFeaturedProfiles('profesor', 6),
    fetchFeaturedProfiles('academia'),
    fetchDanceStyles(),
    fetchHomeStats(),
  ]);

  return (
    <>
      <AuthErrorBanner />
      <HomeClient
        initialClasses={classes}
        salsaClasses={salsaClasses}
        initialTeachers={teachers}
        initialAcademias={academias}
        danceStyles={danceStyles.slice(0, 9)}
        stats={stats}
      />
    </>
  );
}
