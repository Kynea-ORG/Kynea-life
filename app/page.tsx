import { fetchPublishedClasses } from '@/lib/classes/queries';
import { fetchFeaturedProfiles } from '@/lib/profiles/queries';
import { fetchDanceStyles } from '@/lib/catalog/queries';
import { fetchHomeStats } from '@/lib/stats/queries';
import { createClient } from '@/lib/supabase/server';
import HomeClient from './HomeClient';
import AuthErrorBanner from '@/components/AuthErrorBanner';

// Un estilo con más de este número de clases publicadas (como estilo
// principal o secundario) se gana su propia fila destacada en el Home —
// dinámico según el catálogo real, en vez de una lista fija a mano.
const MIN_CLASSES_FOR_FEATURED_ROW = 4;

export default async function Page() {
  const supabase = await createClient();
  const [classes, teachers, academias, danceStyles, stats, { data: { user } }] = await Promise.all([
    fetchPublishedClasses(),
    fetchFeaturedProfiles('profesor', 6),
    fetchFeaturedProfiles('academia', 4),
    fetchDanceStyles(),
    fetchHomeStats(),
    supabase.auth.getUser(),
  ]);

  let userRole: 'alumno' | 'profesor' | 'academia' | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    userRole = profile?.role ?? null;
  }

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
        userRole={userRole}
      />
    </>
  );
}
