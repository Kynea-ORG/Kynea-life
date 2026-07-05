import { createClient } from '@/lib/supabase/server';
import type { DbDanceStyle, DbLevel, DbDistrict } from '@/lib/types';

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

export async function fetchDistricts(city?: string): Promise<DbDistrict[]> {
  const supabase = await createClient();
  let q = supabase.from('districts').select('id, name, city').order('city').order('name');
  if (city) q = q.eq('city', city);
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as DbDistrict[];
}
