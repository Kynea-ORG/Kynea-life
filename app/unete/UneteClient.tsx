'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SmartImage from '@/components/SmartImage';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Eye, EyeOff, Check, X, Zap, Users, ShieldCheck, MessageCircle } from 'lucide-react';
import GoogleIcon from '@/components/GoogleIcon';
import { createClient } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/utils';
import { trackAuthCtaClick, trackAuthAttempt } from '@/lib/analytics';

const PASSWORD_RULES: { label: string; test: (pw: string) => boolean }[] = [
  { label: 'Mínimo 8 caracteres',       test: pw => pw.length >= 8 },
  { label: 'Una letra mayúscula (A-Z)', test: pw => /[A-Z]/.test(pw) },
  { label: 'Una letra minúscula (a-z)', test: pw => /[a-z]/.test(pw) },
  { label: 'Un número (0-9)',           test: pw => /[0-9]/.test(pw) },
  { label: 'Un carácter especial',      test: pw => /[^A-Za-z0-9]/.test(pw) },
];

const BENEFITS = [
  { Icon: Zap,           text: 'Publica tu clase en minutos' },
  { Icon: Users,         text: 'Llega a cientos de alumnos en Latinoamérica' },
  { Icon: ShieldCheck,   text: 'Perfil profesional verificado' },
  { Icon: MessageCircle, text: 'Contacto directo por WhatsApp o Instagram' },
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

export default function UneteClient({ teacherCount }: { teacherCount: number }) {
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
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(redirectTarget ?? '/dashboard');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    trackAuthAttempt({ action: 'registro', method: 'email' });

    const supabase = createClient();
    // Profesor onboarding is the full data-collecting wizard (bio, estilos,
    // WhatsApp/Instagram, foto) — see app/onboarding/page.tsx.
    const nextPath = redirectTarget
      ? `/onboarding?new=1&redirect=${encodeURIComponent(redirectTarget)}`
      : '/onboarding?new=1';

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { name: form.name, role: 'profesor' },
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
      const confirmDest = `/confirmar-email?email=${encodeURIComponent(form.email)}&role=profesor`;
      router.push(redirectTarget ? `${confirmDest}&redirect=${encodeURIComponent(redirectTarget)}` : confirmDest);
    }
  }

  async function handleGoogle() {
    if (!termsAccepted) return;
    setGoogleLoading(true);
    trackAuthAttempt({ action: 'registro', method: 'google' });
    const supabase = createClient();
    const callbackUrl = redirectTarget
      ? `${window.location.origin}/auth/callback?role=profesor&redirect=${encodeURIComponent(redirectTarget)}`
      : `${window.location.origin}/auth/callback?role=profesor`;
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

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-neutral-200 px-6 py-4">
        <Link href="/">
          <Image src="/logo.png" alt="Kynea" width={90} height={30} priority style={{ height: 'auto' }} />
        </Link>
      </header>

      <div className="flex-1 flex flex-col-reverse lg:flex-row">
        {/* Formulario — sheet blanca que monta sobre la ilustración en mobile, columna izquierda en desktop */}
        <div className="relative z-10 -mt-7 lg:mt-0 flex-1 flex items-start lg:items-center justify-center px-5 pt-8 pb-12 lg:py-16 bg-white rounded-t-[28px] lg:rounded-none">
          <div className="w-full max-w-md">
            <h1 className="hidden lg:block text-[28px] font-black text-neutral-900 tracking-tight leading-tight mb-2">
              Únete como profesor
            </h1>
            <p className="hidden lg:block text-[15px] text-neutral-500 mb-7">
              Crea tu cuenta gratis y empieza a publicar tus clases hoy mismo.
            </p>

            {error && (
              <div className="bg-red-bg border-l-4 border-red text-[13px] font-medium px-4 py-3 rounded-lg text-red-700 animate-fade-in mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-5">
              <div>
                <label className="block text-[13px] font-semibold text-neutral-700 mb-1.5">Nombre completo</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Tu nombre"
                  required
                  className="input"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-neutral-700 mb-1.5">Correo electrónico</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="tu@correo.com"
                  required
                  className="input"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-neutral-700 mb-1.5">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
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
                {form.password.length > 0 && (
                  <ul className="flex flex-col gap-1 mt-2 animate-fade-in">
                    {passwordChecks.map(c => (
                      <li key={c.label} className={`flex items-center gap-2 text-[12px] font-figtree ${c.ok ? 'text-green-600' : 'text-neutral-400'}`}>
                        {c.ok
                          ? <Check className="w-3.5 h-3.5 shrink-0" />
                          : <X className="w-3.5 h-3.5 shrink-0" />
                        }
                        {c.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-neutral-900 shrink-0"
                />
                <span className="text-[13px] text-neutral-500 leading-relaxed">
                  Acepto los{' '}
                  <a href="/terminos" target="_blank" rel="noopener noreferrer" className="text-neutral-900 font-semibold hover:underline">
                    Términos y condiciones
                  </a>{' '}
                  y la{' '}
                  <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-neutral-900 font-semibold hover:underline">
                    Política de privacidad y tratamiento de datos personales
                  </a>{' '}
                  de Kynea
                </span>
              </label>

              <button
                type="submit"
                disabled={loading || !passwordValid || !termsAccepted}
                className="btn-primary w-full mt-1 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Creando cuenta…' : 'Crear cuenta de profesor'}
              </button>
            </form>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={!termsAccepted || googleLoading}
              className="w-full btn-outline disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {googleLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <GoogleIcon className="w-4 h-4" />
              }
              Continuar con Google
            </button>

            <p className="text-center text-[13px] text-neutral-400 mt-5">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" onClick={() => trackAuthCtaClick({ action: 'login', location: 'unete_page' })} className="text-neutral-900 font-semibold hover:underline">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>

        {/* Ilustración + propuesta de valor — banda copy+ilustración lado a lado en mobile, panel único con overlay en desktop */}
        <div className="relative shrink-0 lg:flex-1 bg-primary overflow-hidden flex flex-col lg:justify-start lg:px-14 lg:pt-20 lg:h-auto">
          {/* Mobile: compacto — copy corto a la izquierda, ilustración pequeña a la derecha, para que el formulario blanco siempre se vea */}
          <div className="lg:hidden flex items-center gap-3 px-5 py-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-[17px] font-black text-white tracking-tight leading-[1.2]">
                Comparte tu pasión por el baile y llega a más alumnos
              </h2>
            </div>
            <div className="relative w-[72px] h-[72px] shrink-0">
              <SmartImage src="/Bg-Registro-profesores-Mobile.png" alt="" fill className="object-contain object-bottom" />
            </div>
          </div>

          {/* Ilustración desktop — bleed detrás del copy */}
          <div className="hidden lg:block absolute -bottom-10 right-0 w-[50%] max-w-none pointer-events-none">
            <SmartImage src="/BG-Registro-Profesores-2.png" alt="" width={1656} height={2178} className="w-full h-auto" />
          </div>

          {/* Copy desktop */}
          <div className="hidden lg:block relative z-10 lg:max-w-lg">
            <p className="text-[13px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#E9C72A' }}>Únete como profesor</p>
            <h2 className="text-[46px] font-black text-white tracking-tight leading-[1.15] mb-5">
              Comparte tu pasión por el baile y llega a más alumnos
            </h2>

            <ul className="flex flex-col gap-2.5 mb-6">
              {BENEFITS.map(({ Icon, text }) => (
                <li key={text} className="flex items-start gap-2.5">
                  <Icon className="w-4 h-4 text-white shrink-0 mt-0.5" />
                  <span className="text-[15px] font-bold text-white leading-snug">{text}</span>
                </li>
              ))}
            </ul>

            {teacherCount > 0 && (
              <div className="inline-flex items-center gap-2 bg-white border border-neutral-900 rounded-full py-1.5 pl-2 pr-4 mb-4">
                <span className="relative inline-flex w-2 h-2 rounded-full bg-green shrink-0">
                  <span className="absolute inset-0 rounded-full bg-green animate-ping" />
                </span>
                <span className="text-[12.5px] font-bold text-neutral-900">
                  <span className="text-pink-600">{teacherCount}+</span> profesores ya publican en Kynea
                </span>
              </div>
            )}

            <div>
              <Link href="/unete/beneficios" className="text-[13.5px] font-bold text-white underline underline-offset-2 hover:text-white/80 transition-colors">
                Conoce todos los beneficios →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
