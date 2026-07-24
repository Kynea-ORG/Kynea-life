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
  const [c, t, s, v] = await Promise.all([
    supabase.from('classes').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['profesor', 'academia']),
    supabase.from('dance_styles').select('*', { count: 'exact', head: true }),
    // City count reflects where classes actually are (venues.city), not a
    // pre-seeded catalog — see migration 25.
    supabase.from('classes').select('venue:venues(city)').eq('status', 'published'),
  ]);
  const cityNames = [...new Set(
    (v.data ?? [])
      .map(row => {
        const raw = row.venue as { city: string | null } | Array<{ city: string | null }> | null;
        const venue = Array.isArray(raw) ? (raw[0] ?? null) : raw;
        return venue?.city ?? null;
      })
      .filter((city): city is string => Boolean(city))
  )].sort();
  return { classes: c.count ?? 0, teachers: t.count ?? 0, styles: s.count ?? 0, cities: cityNames.length, cityNames };
}
