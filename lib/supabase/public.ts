import { createClient, SupabaseClient } from '@supabase/supabase-js';

let publicClient: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client configured with the anonymous public key.
 * This client does NOT read or write cookies, and does NOT persist user sessions.
 * It is completely safe to call inside Next.js unstable_cache, ISR, or static generation,
 * avoiding "Dynamic server usage: cookies() cannot be read inside unstable_cache" errors.
 * 
 * Row Level Security (RLS) ensures that only public data (e.g. status = 'published' classes,
 * dance_styles, class_levels, venues, public profiles) can be selected.
 */
export function getPublicClient(): SupabaseClient {
  if (!publicClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }

    publicClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return publicClient;
}

/**
 * Helper to reset or override the public client in unit tests.
 */
export function setPublicClientForTesting(client: SupabaseClient | null): void {
  publicClient = client;
}
