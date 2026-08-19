'use client';
import { Suspense, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { trackLoginSuccess } from '@/lib/analytics';

// Fires login_success once for a Google login, wherever it lands. Unlike the
// email/password path (tracked directly in app/login/page.tsx's
// redirectByRole onSuccess), the Google callback (app/auth/callback/route.ts)
// runs server-side and can't push to dataLayer — it can only hand off a
// `?login=1` flag on the redirect. That redirect's destination isn't always
// /clases or /dashboard either: a `redirectTarget` can send it anywhere (e.g.
// back to the class detail page someone was gated out of). So instead of
// wiring this into a specific "landing page", it's mounted once globally in
// app/layout.tsx (same pattern as ImageProviderHealthCheck) and catches the
// flag no matter where it lands.
function LoginSuccessListenerInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasFlag = searchParams.get('login') === '1';

  useEffect(() => {
    if (!hasFlag) return;

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role) trackLoginSuccess({ role: profile.role, method: 'google' });
      }
      // Strip the flag so a refresh or back-navigation doesn't re-fire it.
      const params = new URLSearchParams(searchParams.toString());
      params.delete('login');
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFlag]);

  return null;
}

export default function LoginSuccessListener() {
  return (
    <Suspense fallback={null}>
      <LoginSuccessListenerInner />
    </Suspense>
  );
}
