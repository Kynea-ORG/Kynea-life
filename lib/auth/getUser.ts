import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

// React's cache() dedupes calls with identical arguments within a single
// render pass (one navigation) — so proxy.ts still does its own getUser()
// (it runs before the React tree even starts, a separate stage), but every
// layout.tsx / page.tsx / query that calls this one during the same request
// shares a single network round-trip to Supabase's auth server instead of
// each paying for its own. This was the main source of /dashboard's
// multi-second navigation delay — see docs/TASKS.md.
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});
