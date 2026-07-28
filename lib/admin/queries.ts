import { createClient } from '@/lib/supabase/server';

export async function fetchIsAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (error) {
    console.error('fetchIsAdmin error:', error.message);
    return false;
  }
  return data?.is_admin === true;
}
