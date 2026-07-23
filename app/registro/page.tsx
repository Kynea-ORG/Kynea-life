'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Globe, User, BookOpen, Building2, Loader2, Eye, EyeOff, Check, X } from 'lucide-react';

const PASSWORD_RULES: { label: string; test: (pw: string) => boolean }[] = [
  { label: 'Mínimo 8 caracteres',       test: pw => pw.length >= 8 },
  { label: 'Una letra mayúscula (A-Z)', test: pw => /[A-Z]/.test(pw) },
  { label: 'Una letra minúscula (a-z)', test: pw => /[a-z]/.test(pw) },
  { label: 'Un número (0-9)',           test: pw => /[0-9]/.test(pw) },
  { label: 'Un carácter especial',      test: pw => /[^A-Za-z0-9]/.test(pw) },
];
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useFunFocusBackground } from '@/lib/hooks/useFunFocusBackground';

type Role = 'alumno' | 'profesor' | 'academia';

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

const ROLES: { key: Role; icon: React.ElementType; label: string; description: string }[] = [
  { key: 'alumno',   icon: User,      label: 'Alumno',   description: 'Quiero encontrar clases de baile' },
  { key: 'profesor', icon: BookOpen,  label: 'Profesor', description: 'Doy clases de manera independiente' },
  { key: 'academia', icon: Building2, label: 'Academia', description: 'Gestiono un estudio o academia de danza' },
];

export default function RegistroPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [step, setStep] = useState<'role' | 'form'>('role');
  const [form, setForm] = useState({ name: '', representante: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { bgColor, bgRef, shift } = useFunFocusBackground();

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard');
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setError('');
    setLoading(true);

    const supabase = createClient();
    const nextPath = role === 'alumno' ? '/clases' : '/onboarding?new=1';

    const metadata: Record<string, string> = { name: form.name, role };
    if (role === 'academia' && form.representante) {
      metadata.representante = form.representante;
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: metadata,
      },
    });

    if (authError) {
      setError(getAuthErrorMessage(authError.message));
      setLoading(false);
      return;
    }

    // No authError → Supabase accepted the signup (new account or re-send to existing
    // unconfirmed email via enumeration protection). Always proceed: the OTP step will
    // surface any real conflict (already-confirmed account).
    if (data.session) {
      router.refresh();
      router.push(nextPath);
    } else {
      router.push(`/confirmar-email?email=${encodeURIComponent(form.email)}&role=${role}`);
    }
  }

  async function handleGoogle() {
    if (!role || !termsAccepted) return;
    setGoogleLoading(true);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
      },
    });
    if (oauthError) {
      setError('No se pudo continuar con Google. Intenta de nuevo.');
      setGoogleLoading(false);
    }
    // If no error, browser redirects to Google — loading stays true intentionally
  }

  const roleLabel = ROLES.find(r => r.key === role)?.label ?? '';
  const canContinue = !!role && termsAccepted;
  const passwordChecks = PASSWORD_RULES.map(r => ({ ...r, ok: r.test(form.password) }));
  const passwordValid  = passwordChecks.every(c => c.ok);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      <div
        ref={bgRef}
        aria-hidden
        className="absolute z-0"
        style={{
          top: '-5%', left: '-5%', right: '-5%', bottom: '-5%',
          backgroundColor: bgColor,
          transition: 'background-color 900ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />

      <div className="relative z-10 flex flex-col flex-1">
      <header className="bg-white border-b border-neutral-200 px-6 py-4">
        <Link href="/">
          <Image src="/logo.png" alt="Kynea" width={90} height={30} priority style={{ height: 'auto' }} />
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">

            {step === 'role' ? (
              <div key="role-step" className="animate-fade-in">
                <h1 className="text-[24px] font-black text-neutral-900 tracking-snug mb-1">Crear cuenta</h1>
                <p className="text-[15px] text-neutral-500 mb-6">
                  Elige cómo quieres usar Kynea para continuar.
                </p>

                <div className="flex flex-col gap-3 mb-5">
                  {ROLES.map(r => {
                    const Icon = r.icon;
                    const isSelected = role === r.key;
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => { setRole(r.key); shift(); }}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-[border-color,background-color] active:scale-[0.98] ${
                          isSelected
                            ? 'border-neutral-900 bg-neutral-50'
                            : 'border-neutral-200 hover:border-neutral-400'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-neutral-900 text-[15px]">{r.label}</p>
                          <p className="text-[13px] text-neutral-500">{r.description}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 shrink-0 transition-[background-color,border-color] flex items-center justify-center ${
                          isSelected ? 'bg-neutral-900 border-neutral-900' : 'border-neutral-300'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Terms checkbox */}
                <label className="flex items-start gap-3 cursor-pointer mb-5 select-none">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={e => { setTermsAccepted(e.target.checked); shift(); }}
                    className="mt-0.5 w-4 h-4 accent-neutral-900 shrink-0"
                  />
                  <span className="text-[13px] text-neutral-500 leading-relaxed">
                    Acepto los{' '}
                    <a href="/terminos" target="_blank" rel="noopener noreferrer" className="text-neutral-900 font-semibold hover:underline">
                      Términos y condiciones
                    </a>{' '}
                    de Kynea
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => { if (canContinue) { setStep('form'); shift(); } }}
                  disabled={!canContinue}
                  className="btn-dark w-full mb-3 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {role ? `Continuar como ${roleLabel} con correo` : 'Continuar con correo'}
                </button>

                <button
                  type="button"
                  onClick={() => { handleGoogle(); shift(); }}
                  disabled={!canContinue || googleLoading}
                  className="w-full btn-outline disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {googleLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Globe className="w-4 h-4" />
                  }
                  {role ? `Continuar como ${roleLabel} con Google` : 'Continuar con Google'}
                </button>

                <p className="text-center text-[13px] text-neutral-400 mt-5">
                  ¿Ya tienes cuenta?{' '}
                  <Link href="/login" onClick={shift} className="text-neutral-900 font-semibold hover:underline">
                    Inicia sesión
                  </Link>
                </p>
              </div>
            ) : (
              <div key="form-step" className="animate-fade-in">
                <button
                  type="button"
                  onClick={() => { setStep('role'); shift(); }}
                  className="text-[13px] text-neutral-400 hover:text-neutral-600 mb-5 transition-colors"
                >
                  ← Cambiar tipo de cuenta
                </button>

                <h1 className="text-[24px] font-black text-neutral-900 tracking-snug mb-1">
                  Cuenta de {roleLabel}
                </h1>
                <p className="text-[15px] text-neutral-500 mb-6">Es gratis, sin tarjeta de crédito.</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {error && (
                    <div className="bg-red-bg border-l-4 border-red text-[13px] font-medium px-4 py-3 rounded-lg text-red-700 animate-fade-in">
                      {error}
                    </div>
                  )}

                  {/* Name field — label changes by role */}
                  <div>
                    <label className="block text-[13px] font-semibold text-neutral-700 mb-1.5">
                      {role === 'academia' ? 'Nombre de la academia' : 'Nombre completo'}
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      onFocus={shift}
                      placeholder={role === 'academia' ? 'Ej. Studio Ritmo Latino' : 'Tu nombre'}
                      required
                      className="input"
                    />
                  </div>

                  {/* Representative name — academia only */}
                  {role === 'academia' && (
                    <div>
                      <label className="block text-[13px] font-semibold text-neutral-700 mb-1.5">
                        Nombre del representante
                      </label>
                      <input
                        type="text"
                        value={form.representante}
                        onChange={e => setForm(f => ({ ...f, representante: e.target.value }))}
                        onFocus={shift}
                        placeholder="Nombre de quien gestiona la cuenta"
                        required
                        className="input"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[13px] font-semibold text-neutral-700 mb-1.5">Correo electrónico</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      onFocus={shift}
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
                        onFocus={shift}
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
                          <li key={c.label} className={`flex items-center gap-2 text-[12px] ${c.ok ? 'text-green-600' : 'text-neutral-400'}`}>
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

                  <button
                    type="submit"
                    disabled={loading || !passwordValid}
                    onClick={shift}
                    className="btn-dark w-full mt-1 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? 'Creando cuenta…' : 'Crear cuenta'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
