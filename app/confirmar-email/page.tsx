'use client';
import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Loader2, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { redirectByRole } from '@/lib/auth/redirectByRole';
import { safeRedirectPath } from '@/lib/utils';
import { trackAuthCtaClick, trackAuthAttempt, trackOtpVerifyFailed } from '@/lib/analytics';
import ErrorBanner from '@/components/ErrorBanner';

const CODE_LENGTH = 6;
const VALID_ROLES = new Set(['alumno', 'profesor', 'academia']);

function ConfirmarEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const roleParam = searchParams.get('role') ?? '';
  // Only accept known roles — ignore anything else (mirrors auth/callback/route.ts's VALID_ROLES guard)
  const role = VALID_ROLES.has(roleParam) ? roleParam : null;
  const redirectTarget = safeRedirectPath(searchParams.get('redirect'));

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const savedUntil = sessionStorage.getItem('kynea_resend_until');
      if (savedUntil) {
        const remaining = Math.ceil((parseInt(savedUntil, 10) - Date.now()) / 1000);
        if (remaining > 0) return remaining;
        sessionStorage.removeItem('kynea_resend_until');
      }
    } catch {}
    return 0;
  });

  const code = digits.join('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown(c => {
        if (c <= 1) {
          sessionStorage.removeItem('kynea_resend_until');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  useEffect(() => {
    if (code.length === CODE_LENGTH && !verifying) {
      handleVerify();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  function setDigit(i: number, val: string) {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      setDigits(d => { const n = [...d]; n[i] = ''; return n; });
      return;
    }
    // Permite pegar el código completo en cualquier casilla
    if (clean.length > 1) {
      const chars = clean.slice(0, CODE_LENGTH).split('');
      const next = Array(CODE_LENGTH).fill('').map((_, idx) => chars[idx] ?? '');
      setDigits(next);
      const lastFilled = Math.min(chars.length, CODE_LENGTH) - 1;
      inputsRef.current[lastFilled]?.focus();
      return;
    }
    setDigits(d => { const n = [...d]; n[i] = clean; return n; });
    if (i < CODE_LENGTH - 1) inputsRef.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
  }

  async function handleVerify(e?: React.FormEvent) {
    e?.preventDefault();
    if (code.length !== CODE_LENGTH) {
      setError(`Ingresa el código completo de ${CODE_LENGTH} dígitos.`);
      return;
    }
    setVerifying(true);
    setError('');
    trackAuthAttempt({ action: 'registro', method: 'email_otp' });

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'signup',
    });

    if (verifyError) {
      trackOtpVerifyFailed();
      setError('Código incorrecto o expirado. Revisa el correo o reenvía uno nuevo.');
      setVerifying(false);
      return;
    }

    // Sesión activa — redirigir según rol
    await redirectByRole(supabase, {
      refresh: () => router.refresh(),
      expectedRole: role,
      onSuccess: (_path, notice) => {
        // This page is only reached right after a fresh signup — every role
        // goes through /onboarding first (alumno gets a short intro
        // carousel, profesor/academia the full wizard). redirectTarget (e.g.
        // the class the user was trying to contact) rides along.
        let dest = '/onboarding?new=1';
        if (redirectTarget) dest += `&redirect=${encodeURIComponent(redirectTarget)}`;
        if (notice) dest += `&notice=${notice}`;
        router.push(dest);
      },
      onError: (msg) => { setError(msg); setVerifying(false); },
    });
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError('');
    setResent(false);
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email });
    if (resendError) {
      setError(resendError.message);
    } else {
      setResent(true);
      const until = Date.now() + 60000;
      sessionStorage.setItem('kynea_resend_until', String(until));
      setCooldown(60);
    }
    setResending(false);
  }

  if (!email) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <header className="bg-white border-b border-neutral-200 px-6 py-4">
          <Link href="/"><Image src="/logo.png" alt="Kynea" width={90} height={30} priority /></Link>
        </header>
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 max-w-md w-full text-center">
            <div className="w-14 h-14 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Mail className="w-7 h-7 text-neutral-400" />
            </div>
            <p className="text-[16px] font-semibold text-neutral-900 mb-2">Enlace no válido</p>
            <p className="text-[14px] text-neutral-600 mb-6">El enlace de confirmación no es válido o ya expiró.</p>
            <Link href="/registro" onClick={() => trackAuthCtaClick({ action: 'registro', location: 'confirmar_email_page' })} className="btn-dark inline-block">Volver al registro</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-white border-b border-neutral-200 px-6 py-4">
        <Link href="/">
          <Image src="/logo.png" alt="Kynea" width={90} height={30} priority />
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 text-center">
            <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-neutral-700" />
            </div>
            <h1 className="text-[24px] font-black text-neutral-900 tracking-snug mb-2">Confirma tu correo</h1>
            <p className="text-[15px] text-neutral-600 mb-1">
              Enviamos un código de {CODE_LENGTH} dígitos a
            </p>
            {email && (
              <p className="text-[15px] font-semibold text-neutral-900 mb-6">{email}</p>
            )}

            {error && <ErrorBanner className="mb-4 text-left">{error}</ErrorBanner>}

            <form onSubmit={handleVerify}>
              <div className="flex justify-center gap-2 mb-6">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { inputsRef.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={CODE_LENGTH}
                    value={d}
                    onChange={e => setDigit(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    autoFocus={i === 0}
                    className="w-12 h-14 text-center text-[22px] font-bold border-2 border-neutral-200 rounded-xl text-neutral-900 outline-none focus:border-neutral-900 transition-colors"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={verifying || code.length !== CODE_LENGTH}
                className="w-full btn-dark flex items-center justify-center gap-2 mb-3"
              >
                {verifying && <Loader2 className="w-4 h-4 animate-spin" />}
                {verifying ? 'Verificando…' : 'Confirmar cuenta'}
              </button>
            </form>

            {resent && (
              <div key="resent" className="bg-green-bg border border-green-dark/20 text-green-text text-[13px] font-semibold px-4 py-3 rounded-lg mb-4 animate-fade-in">
                ¡Código reenviado! Revisa tu bandeja de entrada.
              </div>
            )}

            <button
              key="resend-btn"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="w-full btn-outline flex items-center justify-center gap-2 mb-4 animate-fade-in disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {resending ? 'Enviando…' : cooldown > 0 ? `Reenviar código (${cooldown}s)` : 'Reenviar código'}
            </button>

            <p className="text-[12px] text-neutral-400 mb-3">
              Revisa también la carpeta de spam. El código expira en 1 hora.
            </p>

            <Link
              href="/registro"
              onClick={() => trackAuthCtaClick({ action: 'registro', location: 'confirmar_email_page' })}
              className="text-[13px] text-neutral-600 hover:text-neutral-700 transition-colors"
            >
              ← Volver y cambiar email
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmarEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-neutral-600 text-sm">Cargando…</div>
      </div>
    }>
      <ConfirmarEmailContent />
    </Suspense>
  );
}
