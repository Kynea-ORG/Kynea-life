import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth/getUser';
import { fetchDanceStyles } from '@/lib/catalog/queries';
import PerfilClient from './PerfilClient';

export default async function PerfilPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const supabase = await createClient();

  const [profileResult, danceStyles, venueResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('role, name, bio, nationality, years_experience, ruc, whatsapp, instagram, tiktok, youtube, website, photo_url, photo_position, photo_zoom, team_size, branch_count, cover_image_url, cover_image_position, cover_image_zoom, profile_styles(style_id, dance_styles(name))')
      .eq('id', user.id)
      .single(),
    fetchDanceStyles(),
    supabase
      .from('venues')
      .select('address, district, city')
      .eq('owner_id', user.id)
      .eq('is_primary', true)
      .maybeSingle(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = profileResult.data as any;
  const primaryVenue = venueResult.data;

  return (
    // PerfilClient reads ?missing=... via useSearchParams (contact-gating
    // deep-link landing), which requires a Suspense boundary.
    <Suspense>
      <PerfilClient
        role={profile?.role ?? 'alumno'}
        profile={profile ?? {
          name: null, bio: null, nationality: null, years_experience: null,
          ruc: null, whatsapp: null, instagram: null, tiktok: null,
          youtube: null, website: null, photo_url: null,
          photo_position: null, photo_zoom: null,
          team_size: null, branch_count: null,
          cover_image_url: null, cover_image_position: null, cover_image_zoom: null,
          profile_styles: null,
        }}
        primaryVenue={primaryVenue ?? null}
        danceStyles={danceStyles.map(s => s.name)}
      />
    </Suspense>
  );
}
