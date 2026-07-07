import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Next.js 16: middleware.ts is deprecated and renamed to proxy.ts.
// The exported function must be named `proxy`.
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase env vars are missing (e.g. preview deploys without secrets),
  // skip auth checks entirely so the app still renders public routes.
  if (!url || !key) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() verifies JWT against Supabase auth server (more secure than getSession)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Protect /dashboard, /onboarding and /completar-registro — redirect to /login if not authenticated
  if ((path.startsWith('/dashboard') || path.startsWith('/onboarding') || path.startsWith('/completar-registro')) && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Enforce onboarding: authenticated users who haven't completed it can only access
  // the public home page, auth flows, and the onboarding itself.
  // onboarding_done is stored in user_metadata (set after finishing onboarding or
  // immediately for alumnos who don't need it) — no extra DB query needed.
  if (user && user.user_metadata?.onboarding_done !== true) {
    const ONBOARDING_FREE = [
      '/onboarding', '/auth', '/login', '/registro',
      '/confirmar-email', '/completar-registro', '/reset-password',
      '/terminos', '/_next',
    ];
    const isAllowed = path === '/' || ONBOARDING_FREE.some(p => path.startsWith(p));
    if (!isAllowed) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
