import { createClient } from '@/lib/supabase/server';
import { roleMismatchNotice } from '@/lib/auth/redirectByRole';
import { safeRedirectPath } from '@/lib/utils';
import { NextResponse } from 'next/server';

const VALID_ROLES = new Set(['alumno', 'profesor', 'academia']);

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '';
  const roleParam = searchParams.get('role') ?? '';

  // `next` bypasses role resolution entirely (email confirm / password reset
  // flows, below) — `redirect` is a DIFFERENT param: where to land AFTER the
  // normal role-resolution logic finishes (e.g. the class a user was trying
  // to contact when the login/registro gate sent them here via Google).
  const safePath = safeRedirectPath(next);
  const redirectTarget = safeRedirectPath(searchParams.get('redirect'));
  // Only accept known roles — ignore anything else
  const incomingRole = VALID_ROLES.has(roleParam) ? roleParam : null;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Email confirmation / password reset flows — go straight to destination
      if (safePath) {
        const dest = safePath.startsWith('/reset-password')
          ? `${origin}/reset-password?recovery=1`
          : `${origin}${safePath}`;
        return NextResponse.redirect(dest);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        // No role yet → new registration not completed (typical for new Google user)
        if (!profile?.role) {
          if (incomingRole) {
            // Role was pre-selected on /registro — apply it directly and skip /completar-registro
            await supabase
              .from('profiles')
              .update({ role: incomingRole })
              .eq('id', user.id);

            // Sync role to user_metadata so proxy.ts can read it without a DB query.
            await supabase.auth.updateUser({ data: { role: incomingRole } });

            // Every role goes through /onboarding on first signup — alumno gets
            // a short intro carousel, profesor/academia the full wizard.
            // redirectTarget (e.g. the class the user was trying to contact) rides along.
            const onboardingUrl = redirectTarget
              ? `${origin}/onboarding?new=1&redirect=${encodeURIComponent(redirectTarget)}`
              : `${origin}/onboarding?new=1`;
            return NextResponse.redirect(onboardingUrl);
          }

          // New user came from /login (no role) — must choose role first
          const completarUrl = redirectTarget
            ? `${origin}/completar-registro?redirect=${encodeURIComponent(redirectTarget)}`
            : `${origin}/completar-registro`;
          return NextResponse.redirect(completarUrl);
        }

        // Existing user with a role — redirect to their area, or back to
        // whatever they were trying to do (e.g. the login gate on a class
        // contact modal) when a redirectTarget is present.
        const dest = redirectTarget ?? (profile.role === 'alumno' ? '/clases' : '/dashboard');
        // If they came from /registro with a different role, warn them they already have an account
        const notice = roleMismatchNotice(incomingRole, profile.role);
        // `login=1` is a one-shot flag for LoginSuccessListener (mounted in
        // app/layout.tsx) to fire trackLoginSuccess once — this route runs
        // server-side and has no dataLayer access of its own.
        const params = new URLSearchParams({ login: '1' });
        if (notice) params.set('notice', notice);
        return NextResponse.redirect(`${origin}${dest}?${params.toString()}`);
      }
    }
  }
  return NextResponse.redirect(`${origin}/login?error=link_invalido`);
}
