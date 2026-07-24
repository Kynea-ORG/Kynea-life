import type { SupabaseClient } from '@supabase/supabase-js';

export async function lookupLevelId(supabase: SupabaseClient, name: string): Promise<number | null> {
  if (!name) return null;
  const { data } = await supabase.from('class_levels').select('id').eq('name', name).single();
  return data?.id ?? null;
}

export async function lookupStyleId(supabase: SupabaseClient, name: string): Promise<number | null> {
  if (!name) return null;
  const { data } = await supabase.from('dance_styles').select('id').eq('name', name).single();
  return data?.id ?? null;
}
