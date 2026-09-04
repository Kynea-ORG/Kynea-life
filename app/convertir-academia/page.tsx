import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth/getUser';
import ConvertirAcademiaClient from './ConvertirAcademiaClient';

export default async function ConvertirAcademiaPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name, photo_url, photo_position, photo_zoom')
    .eq('id', user.id)
    .single();

  // Solo un profesor puede pedir esto — una academia ya lo es, y si ya tiene
  // una solicitud pendiente no hay nada que llenar de nuevo (ver el banner
  // amarillo en /dashboard).
  if (profile?.role !== 'profesor') redirect('/dashboard');

  const { data: pendingRequest } = await supabase
    .from('academia_requests')
    .select('id')
    .eq('profile_id', user.id)
    .eq('kind', 'conversion')
    .eq('status', 'pending')
    .maybeSingle();
  if (pendingRequest) redirect('/dashboard');

  return (
    <ConvertirAcademiaClient
      initialName={profile.name ?? ''}
      initialPhotoUrl={profile.photo_url ?? ''}
      initialPhotoPosition={profile.photo_position || '50% 50%'}
      initialPhotoZoom={profile.photo_zoom ?? 1}
    />
  );
}
