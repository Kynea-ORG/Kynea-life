import { getPublicClient } from '@/lib/supabase/public';
import { safeCache } from '@/lib/cache';
import type { DbDanceStyle, DbLevel } from '@/lib/types';

async function getDanceStyles(): Promise<DbDanceStyle[]> {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from('dance_styles')
    .select('id, name, slug, emoji')
    .order('ord');
  if (error) return [];
  return (data ?? []) as DbDanceStyle[];
}

export const fetchDanceStyles = safeCache(
  getDanceStyles,
  ['dance_styles'],
  { revalidate: 3600, tags: ['catalog'] }
);

async function getClassLevels(): Promise<DbLevel[]> {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from('class_levels')
    .select('id, name')
    .order('ord');
  if (error) return [];
  return (data ?? []) as DbLevel[];
}

export const fetchClassLevels = safeCache(
  getClassLevels,
  ['class_levels'],
  { revalidate: 3600, tags: ['catalog'] }
);

// Published-class count per style_id, keyed by dance_styles.id — a class
// counts toward every style it's tagged with (class_styles is many-to-many),
// not just its main one. Explicit status filter rather than relying on RLS:
// a logged-in teacher's own drafts are also visible to them under
// "classes_select", which would otherwise inflate their view of the counts.
async function getStyleClassCounts(): Promise<Record<number, number>> {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from('classes')
    .select('class_styles(style_id)')
    .eq('status', 'published');
  if (error || !data) return {};

  const counts: Record<number, number> = {};
  for (const row of data as unknown as { class_styles: { style_id: number }[] | null }[]) {
    for (const cs of row.class_styles ?? []) {
      counts[cs.style_id] = (counts[cs.style_id] ?? 0) + 1;
    }
  }
  return counts;
}

export const fetchStyleClassCounts = safeCache(
  getStyleClassCounts,
  ['style_class_counts'],
  { revalidate: 600, tags: ['catalog', 'classes'] }
);

export interface LocationOption {
  city: string;
  district?: string;
  label: string;
  activeClassesCount: number;
}

function cleanLocationName(str?: string | null): string {
  if (!str) return '';
  return str
    .trim()
    .replace(/^provincia de /i, '')
    .replace(/ province$/i, '')
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

async function getLocationOptions(): Promise<LocationOption[]> {
  const supabase = getPublicClient();
  const today = new Date().toISOString().split('T')[0];

  const [{ data: venues }, { data: classes }] = await Promise.all([
    supabase.from('venues').select('id, city, district'),
    supabase
      .from('classes')
      .select('venue_id')
      .eq('status', 'published')
      .or(`end_date.is.null,end_date.gte.${today}`),
  ]);

  const venueToCount: Record<string, number> = {};
  classes?.forEach(c => {
    if (c.venue_id) {
      venueToCount[c.venue_id] = (venueToCount[c.venue_id] || 0) + 1;
    }
  });

  const map = new Map<string, LocationOption>();

  venues?.forEach(v => {
    if (!v.city && !v.district) return;
    const city = cleanLocationName(v.city);
    const district = cleanLocationName(v.district);

    let normDistrict = district;
    if (normDistrict === 'Surco') normDistrict = 'Santiago De Surco';

    const key = normDistrict ? `${normDistrict}|${city}` : `|${city}`;
    const label = normDistrict && normDistrict !== city
      ? `${normDistrict}, ${city}`
      : (normDistrict || city);

    const existing = map.get(key) || { city, district: normDistrict || undefined, label, activeClassesCount: 0 };
    existing.activeClassesCount += (venueToCount[v.id] || 0);
    map.set(key, existing);
  });

  const cityTotals = new Map<string, { count: number; countLocations: number }>();
  for (const opt of map.values()) {
    const prev = cityTotals.get(opt.city) || { count: 0, countLocations: 0 };
    cityTotals.set(opt.city, {
      count: prev.count + opt.activeClassesCount,
      countLocations: prev.countLocations + 1,
    });
  }

  for (const [cityName, stats] of cityTotals.entries()) {
    if (!cityName) continue;
    if (stats.countLocations >= 2) {
      const wholeCityKey = `__all__|${cityName}`;
      map.set(wholeCityKey, {
        city: cityName,
        district: undefined,
        label: `${cityName} (Toda la ciudad)`,
        activeClassesCount: stats.count,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const aIsAll = a.label.includes('(Toda la ciudad)');
    const bIsAll = b.label.includes('(Toda la ciudad)');
    if (aIsAll && !bIsAll && a.activeClassesCount > 0) return -1;
    if (!aIsAll && bIsAll && b.activeClassesCount > 0) return 1;

    if (a.activeClassesCount > 0 && b.activeClassesCount === 0) return -1;
    if (a.activeClassesCount === 0 && b.activeClassesCount > 0) return 1;

    if (b.activeClassesCount !== a.activeClassesCount) {
      return b.activeClassesCount - a.activeClassesCount;
    }
    return a.label.localeCompare(b.label, 'es', { sensitivity: 'base' });
  });
}

export const fetchLocationOptions = safeCache(
  getLocationOptions,
  ['location_options'],
  { revalidate: 1800, tags: ['catalog', 'venues', 'classes'] }
);

