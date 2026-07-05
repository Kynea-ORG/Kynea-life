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

export async function lookupDistrictId(supabase: SupabaseClient, districtName: string, city: string): Promise<number | null> {
  if (!districtName || !city) return null;
  const { data } = await supabase.from('districts').select('id').eq('name', districtName).eq('city', city).single();
  return data?.id ?? null;
}
