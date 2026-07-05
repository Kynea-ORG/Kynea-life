import { createClient } from '@/lib/supabase/server';

export interface HomeStats {
  classes: number;
  teachers: number;
  styles: number;
  cities: number;
  cityNames: string[];
}

export async function fetchHomeStats(): Promise<HomeStats> {
  const supabase = await createClient();
  const [c, t, s, d] = await Promise.all([
    supabase.from('classes').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['profesor', 'academia']),
    supabase.from('dance_styles').select('*', { count: 'exact', head: true }),
    supabase.from('districts').select('city'),
  ]);
  const cityNames = [...new Set((d.data ?? []).map((r: { city: string }) => r.city))].sort();
  return { classes: c.count ?? 0, teachers: t.count ?? 0, styles: s.count ?? 0, cities: cityNames.length, cityNames };
}
