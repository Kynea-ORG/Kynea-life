import { createClient } from '@/lib/supabase/server';
import { roleMismatchNotice } from '@/lib/auth/redirectByRole';
import { NextResponse } from 'next/server';

const VALID_ROLES = new Set(['alumno', 'profesor', 'academia']);

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '';
  const roleParam = searchParams.get('role') ?? '';

  // Only allow same-origin relative paths to prevent open redirect attacks
  const safePath = next.startsWith('/') && !next.startsWith('//') ? next : null;
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
            // Alumnos don't need onboarding — mark them as done immediately.
            await supabase.auth.updateUser({
              data: {
                role: incomingRole,
                ...(incomingRole === 'alumno' ? { onboarding_done: true } : {}),
              },
            });

            const dest = incomingRole === 'alumno' ? '/clases' : '/onboarding?new=1';
            return NextResponse.redirect(`${origin}${dest}`);
          }

          // New user came from /login (no role) — must choose role first
          return NextResponse.redirect(`${origin}/completar-registro`);
        }

        // Existing user with a role — redirect to their area
        const dest = profile.role === 'alumno' ? '/clases' : '/dashboard';
        // If they came from /registro with a different role, warn them they already have an account
        const notice = roleMismatchNotice(incomingRole, profile.role);
        const url = notice ? `${origin}${dest}?notice=${notice}` : `${origin}${dest}`;
        return NextResponse.redirect(url);
      }
    }
  }
  return NextResponse.redirect(`${origin}/login?error=link_invalido`);
}
