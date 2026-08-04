'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SmartImage from '@/components/SmartImage';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import GoogleIcon from '@/components/GoogleIcon';
import { createClient } from '@/lib/supabase/client';
import { redirectByRole } from '@/lib/auth/redirectByRole';
import { useFunFocusBackground } from '@/lib/hooks/useFunFocusBackground';
import { safeRedirectPath } from '@/lib/utils';
import { trackAuthCtaClick, trackAuthAttempt } from '@/lib/analytics';

function errorMessageFromParam(errorParam: string | null): string {
  if (errorParam === 'cuenta_incompleta') {
    return 'Tu cuenta no pudo completarse correctamente. Vuelve a registrarte o contacta soporte.';
  }
  if (errorParam === 'link_invalido') {
    return 'El enlace de confirmación no es válido o ya expiró. Solicita uno nuevo.';
  }
  return '';
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = safeRedirectPath(searchParams.get('redirect'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(() => errorMessageFromParam(searchParams.get('error')));
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loginFailed, setLoginFailed] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const { shift } = useFunFocusBackground();

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(redirectTarget ?? '/dashboard');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleGoogle() {
    setGoogleLoading(true);
    trackAuthAttempt({ action: 'login', method: 'google' });
    const supabase = createClient();
    const callbackUrl = redirectTarget
      ? `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTarget)}`
      : `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl },
    });
    if (error) {
      setError('No se pudo iniciar sesión con Google. Intenta de nuevo.');
      setGoogleLoading(false);
    }
    // If no error, browser redirects to Google — loading stays true intentionally
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);
    const supabase = createClient();

    // Check signup provider before sending reset email —
    // accounts created with Google don't have a password to reset.
    const { data: provider } = await supabase.rpc('email_signup_provider', { p_email: resetEmail });
    if (provider === 'google') {
      setResetError('Esta cuenta se creó con Google. Usa el botón "Continuar con Google" para ingresar.');
      setResetLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    if (error) {
      setResetError('No se pudo enviar el enlace. Intenta de nuevo.');
      setResetLoading(false);
      return;
    }
    setResetSent(true);
    setResetLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    trackAuthAttempt({ action: 'login', method: 'email' });

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('Correo o contraseña incorrectos.');
      setLoginFailed(true);
      setLoading(false);
      return;
    }

    await redirectByRole(supabase, {
      refresh: () => router.refresh(),
      onSuccess: (path) => router.push(redirectTarget ?? path),
      onError: (msg) => { setError(msg); setLoading(false); },
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-neutral-200 px-6 py-4">
        <Link href="/">
          <Image src="/logo.png" alt="Kynea" width={90} height={30} priority style={{ height: 'auto' }} />
        </Link>
      </header>

      <div className="flex-1 flex flex-col-reverse lg:flex-row">
        {/* Formulario — sheet blanca que monta sobre la ilustración en mobile, columna izquierda en desktop */}
        <div className="relative z-10 -mt-7 lg:mt-0 flex-1 flex items-end lg:items-center justify-center px-5 pt-8 pb-12 lg:py-16 bg-white rounded-t-[28px] lg:rounded-none">
          <div className="w-full max-w-md">
            <h1 className="hidden lg:block text-[28px] font-black text-neutral-900 tracking-tight mb-1">Iniciar sesión</h1>
            <p className="hidden lg:block text-[15px] text-neutral-500 mb-7">Bienvenido de vuelta a Kynea</p>

            {forgotMode ? (
              resetSent ? (
                <div key="reset-sent" className="flex flex-col items-center gap-4 py-4 animate-fade-in">
                  <p className="text-[15px] font-semibold text-neutral-900 text-center">Revisa tu correo</p>
                  <p className="text-[13px] text-neutral-500 text-center">
                    Te enviamos un enlace a <span className="font-semibold text-neutral-700">{resetEmail}</span> para restablecer tu contraseña.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setForgotMode(false); setResetSent(false); setResetEmail(''); shift(); }}
                    className="text-[13px] text-neutral-900 font-semibold hover:underline"
                  >
                    Volver al inicio de sesión
                  </button>
                </div>
              ) : (
                <form key="reset-form" onSubmit={handleResetPassword} className="flex flex-col gap-4 animate-fade-in">
                  <p className="text-[15px] text-neutral-500">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
                  {resetError && (
                    <div className="bg-red-bg border-l-4 border-red text-[13px] font-medium px-4 py-3 rounded-lg text-red-700 animate-fade-in">
                      {resetError}
                    </div>
                  )}
                  <div>
                    <label className="block text-[13px] font-semibold text-neutral-700 mb-1.5">Correo electrónico</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      onFocus={shift}
                      placeholder="tu@correo.com"
                      required
                      className="input"
                    />
                  </div>
                  <button type="submit" disabled={resetLoading} onClick={shift} className="btn-dark w-full flex items-center justify-center gap-2">
                    {resetLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {resetLoading ? 'Enviando…' : 'Enviar enlace'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setForgotMode(false); shift(); }}
                    className="text-[13px] text-neutral-500 hover:text-neutral-700 text-center"
                  >
                    ← Volver
                  </button>
                </form>
              )
            ) : (
              <div key="login-form" className="animate-fade-in">
                <button type="button" onClick={() => { handleGoogle(); shift(); }} disabled={googleLoading} className="w-full btn-outline mb-4 flex items-center justify-center gap-2 disabled:opacity-50">
                  {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon className="w-4 h-4" />}
                  Continuar con Google
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-neutral-200" />
                  <span className="text-[13px] text-neutral-400">o con correo</span>
                  <div className="flex-1 h-px bg-neutral-200" />
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {error && (
                    <div className="animate-fade-in">
                      <div className="bg-red-bg border-l-4 border-red text-[13px] font-medium px-4 py-3 rounded-lg text-red-700">
                        {error}
                      </div>
                      {loginFailed && (
                        <p className="text-[12px] text-neutral-400 mt-1.5 px-1">
                          ¿Te registraste con Google? Usa el botón de Google para ingresar.
                        </p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-[13px] font-semibold text-neutral-700 mb-1.5">Correo electrónico</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onFocus={shift}
                      placeholder="tu@correo.com"
                      required
                      className="input"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[13px] font-semibold text-neutral-700">Contraseña</label>
                      <button
                        type="button"
                        onClick={() => { setForgotMode(true); shift(); }}
                        className="text-[13px] text-neutral-900 font-semibold hover:underline"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onFocus={shift}
                        placeholder="Tu contraseña"
                        required
                        className="input pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none -mt-1">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => { setRememberMe(e.target.checked); shift(); }}
                      className="w-4 h-4 accent-primary shrink-0"
                    />
                    <span className="text-[13px] text-neutral-500">Recuérdame en este dispositivo</span>
                  </label>

                  <button type="submit" disabled={loading} onClick={shift} className="btn-primary w-full mt-1 flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? 'Ingresando…' : 'Iniciar sesión'}
                  </button>
                </form>

                <p className="text-center text-[13px] text-neutral-400 mt-5">
                  ¿No tienes cuenta?{' '}
                  <Link href="/registro" onClick={() => { trackAuthCtaClick({ action: 'registro', location: 'login_page' }); shift(); }} className="text-neutral-900 font-semibold hover:underline">
                    Regístrate gratis
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Ilustración de marca — copy + ilustración lado a lado en mobile, panel único con overlay en desktop */}
        <div className="relative shrink-0 lg:flex-1 bg-primary overflow-hidden flex flex-col lg:justify-start lg:px-14 lg:pt-20 lg:h-auto">
          {/* Mobile: copy a la izquierda, ilustración pegada a la derecha, sin degradado */}
          <div className="lg:hidden flex items-stretch min-h-[300px]">
            <div className="flex-1 min-w-0 flex flex-col justify-center px-5 py-8">
              <p className="text-[12px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#E9C72A' }}>Iniciar sesión</p>
              <h2 className="text-[26px] font-black text-white tracking-tight leading-[1.15]">
                Bienvenido de vuelta a Kynea
              </h2>
            </div>
            <div className="relative w-[56%] shrink-0">
              <SmartImage
                src="/registro-login- alumnos-mobile.png"
                alt=""
                fill
                className="object-contain object-bottom"
              />
            </div>
          </div>

          {/* Ilustración desktop — bleed detrás del copy */}
          <div className="hidden lg:block absolute -bottom-10 right-[-2%] w-[78%] max-w-none pointer-events-none">
            <SmartImage src="/profesor-alumno-desktop.png" alt="" width={2108} height={1679} className="w-full h-auto" />
          </div>

          {/* Copy desktop */}
          <div className="hidden lg:block relative z-10 lg:max-w-lg">
            <p className="text-[13px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#E9C72A' }}>Iniciar sesión</p>
            <h2 className="text-[46px] font-black text-white tracking-tight leading-[1.15]">
              Bienvenido de vuelta a Kynea
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
