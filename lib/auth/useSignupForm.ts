'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/utils';
import { trackAuthAttempt } from '@/lib/analytics';

export const PASSWORD_RULES: { label: string; test: (pw: string) => boolean }[] = [
  { label: 'Mínimo 8 caracteres',       test: pw => pw.length >= 8 },
  { label: 'Una letra mayúscula (A-Z)', test: pw => /[A-Z]/.test(pw) },
  { label: 'Una letra minúscula (a-z)', test: pw => /[a-z]/.test(pw) },
  { label: 'Un número (0-9)',           test: pw => /[0-9]/.test(pw) },
  { label: 'Un carácter especial',      test: pw => /[^A-Za-z0-9]/.test(pw) },
];

function getAuthErrorMessage(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Ya existe una cuenta con este correo.';
  if (m.includes('password'))
    return 'La contraseña debe tener al menos 8 caracteres.';
  if (m.includes('email') && (m.includes('invalid') || m.includes('format')))
    return 'El correo electrónico no es válido.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Demasiados intentos. Espera unos minutos.';
  return 'Ocurrió un error al crear la cuenta. Intenta de nuevo.';
}

// Signup form logic shared by /unete (role: 'profesor') and /academias
// (role: 'academia') — same PASSWORD_RULES, auth-error mapping, and
// signUp/OAuth flow; the two pages only differ in copy and the visual
// value-prop panel, which stay owned by each page's own component.
export function useSignupForm(role: 'profesor' | 'academia') {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = safeRedirectPath(searchParams.get('redirect'));
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace(redirectTarget ?? '/dashboard');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    trackAuthAttempt({ action: 'registro', method: 'email' });

    const supabase = createClient();
    const nextPath = redirectTarget
      ? `/onboarding?new=1&redirect=${encodeURIComponent(redirectTarget)}`
      : '/onboarding?new=1';

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { name: form.name, role },
      },
    });

    if (authError) {
      setError(getAuthErrorMessage(authError.message));
      setLoading(false);
      return;
    }

    if (data.session) {
      router.refresh();
      router.push(nextPath);
    } else {
      const confirmDest = `/confirmar-email?email=${encodeURIComponent(form.email)}&role=${role}`;
      router.push(redirectTarget ? `${confirmDest}&redirect=${encodeURIComponent(redirectTarget)}` : confirmDest);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    trackAuthAttempt({ action: 'registro', method: 'google' });
    const supabase = createClient();
    const callbackUrl = redirectTarget
      ? `${window.location.origin}/auth/callback?role=${role}&redirect=${encodeURIComponent(redirectTarget)}`
      : `${window.location.origin}/auth/callback?role=${role}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl },
    });
    if (oauthError) {
      setError('No se pudo continuar con Google. Intenta de nuevo.');
      setGoogleLoading(false);
    }
  }

  const passwordChecks = PASSWORD_RULES.map(r => ({ ...r, ok: r.test(form.password) }));
  const passwordValid  = passwordChecks.every(c => c.ok);

  return {
    redirectTarget,
    termsAccepted, setTermsAccepted,
    form, setForm,
    showPass, setShowPass,
    error, loading, googleLoading,
    passwordChecks, passwordValid,
    handleSubmit, handleGoogle,
  };
}
