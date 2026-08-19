import { createClient } from '@/lib/supabase/server';
import type { DbDanceStyle, DbLevel } from '@/lib/types';

export async function fetchDanceStyles(): Promise<DbDanceStyle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('dance_styles')
    .select('id, name, slug, emoji')
    .order('ord');
  if (error) return [];
  return (data ?? []) as DbDanceStyle[];
}

export async function fetchClassLevels(): Promise<DbLevel[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('class_levels')
    .select('id, name')
    .order('ord');
  if (error) return [];
  return (data ?? []) as DbLevel[];
}

// Published-class count per style_id, keyed by dance_styles.id — a class
// counts toward every style it's tagged with (class_styles is many-to-many),
// not just its main one. Explicit status filter rather than relying on RLS:
// a logged-in teacher's own drafts are also visible to them under
// "classes_select", which would otherwise inflate their view of the counts.
export async function fetchStyleClassCounts(): Promise<Record<number, number>> {
  const supabase = await createClient();
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
