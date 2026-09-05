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
