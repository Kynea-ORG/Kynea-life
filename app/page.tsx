import { fetchPublishedClasses, fetchFeaturedProfiles } from '@/lib/queries/classes';
import HomeClient from './HomeClient';
import AuthErrorBanner from '@/components/AuthErrorBanner';

export default async function Page() {
  const [classes, teachers, academias] = await Promise.all([
    fetchPublishedClasses(),
    fetchFeaturedProfiles('profesor'),
    fetchFeaturedProfiles('academia'),
  ]);

  return (
    <>
      <AuthErrorBanner />
      <HomeClient
        initialClasses={classes}
        initialTeachers={teachers}
        initialAcademias={academias}
      />
    </>
  );
}
