import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fetchDanceStyles, fetchDistricts } from '@/lib/catalog/queries';
import PerfilClient from './PerfilClient';

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [profileResult, danceStyles, allDistricts] = await Promise.all([
    supabase
      .from('profiles')
      .select('name, bio, years_experience, whatsapp, instagram, tiktok, youtube, website, photo_url, photo_position, photo_zoom, district:districts(name, city), profile_styles(style_id, dance_styles(name))')
      .eq('id', user.id)
      .single(),
    fetchDanceStyles(),
    fetchDistricts(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = profileResult.data as any;

  return (
    // PerfilClient reads ?missing=... via useSearchParams (contact-gating
    // deep-link landing), which requires a Suspense boundary.
    <Suspense>
      <PerfilClient
        profile={profile ?? {
          name: null, bio: null, years_experience: null,
          whatsapp: null, instagram: null, tiktok: null,
          youtube: null, website: null, photo_url: null,
          photo_position: null, photo_zoom: null,
          district: null, profile_styles: null,
        }}
        danceStyles={danceStyles.map(s => s.name)}
        allDistricts={allDistricts}
      />
    </Suspense>
  );
}
