import { fetchPublishedClasses } from '@/lib/classes/queries';
import { fetchFeaturedProfiles } from '@/lib/profiles/queries';
import { fetchDanceStyles } from '@/lib/catalog/queries';
import { fetchHomeStats } from '@/lib/stats/queries';
import HomeClient from './HomeClient';
import AuthErrorBanner from '@/components/AuthErrorBanner';

export default async function Page() {
  const [classes, teachers, academias, danceStyles, stats] = await Promise.all([
    fetchPublishedClasses(),
    fetchFeaturedProfiles('profesor'),
    fetchFeaturedProfiles('academia'),
    fetchDanceStyles(),
    fetchHomeStats(),
  ]);

  return (
    <>
      <AuthErrorBanner />
      <HomeClient
        initialClasses={classes}
        initialTeachers={teachers}
        initialAcademias={academias}
        danceStyles={danceStyles.slice(0, 9).map(s => s.name)}
        stats={stats}
      />
    </>
  );
}
