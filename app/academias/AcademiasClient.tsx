'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, Eye, EyeOff, Check, X, LayoutGrid, Users, ShieldCheck, MessageCircle } from 'lucide-react';
import GoogleIcon from '@/components/GoogleIcon';
import { trackAuthCtaClick } from '@/lib/analytics';
import { useSignupForm } from '@/lib/auth/useSignupForm';
import ErrorBanner from '@/components/ErrorBanner';

const BENEFITS = [
  { Icon: LayoutGrid,    text: 'Publica todas las clases de tu academia en un solo lugar' },
  { Icon: Users,         text: 'Llega a cientos de alumnos en Latinoamérica' },
  { Icon: ShieldCheck,   text: 'Perfil profesional verificado' },
  { Icon: MessageCircle, text: 'Contacto directo por WhatsApp o Instagram' },
];

export default function AcademiasClient({ teacherCount }: { teacherCount: number }) {
  // Academia onboarding is the same wizard as profesor plus its own fields
  // (RUC, sede principal) — see app/onboarding/page.tsx and docs/TASKS.md
  // sección 8. Publicar queda bloqueado hasta que Kynea apruebe la cuenta
  // (profiles.academia_approved_at) — el resto de la cuenta funciona sin
  // restricción desde el día uno.
  const {
    termsAccepted, setTermsAccepted,
    form, setForm,
    showPass, setShowPass,
    error, loading, googleLoading,
    passwordChecks, passwordValid,
    handleSubmit, handleGoogle,
  } = useSignupForm('academia');

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-neutral-200 px-6 py-4">
        <Link href="/">
          <Image src="/logo.png" alt="Kynea" width={90} height={30} priority style={{ height: 'auto' }} />
        </Link>
      </header>

      <div className="flex-1 flex flex-col-reverse lg:flex-row">
        {/* Formulario — sheet blanca que monta sobre el panel oscuro en mobile, columna izquierda en desktop */}
        <div className="relative z-10 -mt-7 lg:mt-0 flex-1 flex items-start lg:items-center justify-center px-5 pt-8 pb-12 lg:py-16 bg-white rounded-t-[28px] lg:rounded-none">
          <div className="w-full max-w-md">
            <h1 className="hidden lg:block text-[28px] font-black text-neutral-900 tracking-tight leading-tight mb-2">
              Registra tu academia
            </h1>
            <p className="hidden lg:block text-[15px] text-neutral-600 mb-7">
              Crea tu cuenta gratis y empieza a publicar las clases de tu academia hoy mismo.
            </p>

            {error && <ErrorBanner className="mb-4">{error}</ErrorBanner>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-5">
              <div>
                <label className="block text-[13px] font-semibold text-neutral-700 mb-1.5">Nombre de la academia</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej. Studio Ritmo Latino"
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
                      <li key={c.label} className={`flex items-center gap-2 text-[12px] font-figtree ${c.ok ? 'text-green' : 'text-neutral-400'}`}>
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
                <span className="text-[13px] text-neutral-600 leading-relaxed">
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
                className="btn-primary w-full mt-1 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Creando cuenta…' : 'Crear cuenta de academia'}
              </button>
            </form>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full btn-outline flex items-center justify-center gap-2"
            >
              {googleLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <GoogleIcon className="w-4 h-4" />
              }
              Continuar con Google
            </button>

            <p className="text-center text-[13px] text-neutral-400 mt-5">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" onClick={() => trackAuthCtaClick({ action: 'login', location: 'academias_page' })} className="text-neutral-900 font-semibold hover:underline">
                Inicia sesión
              </Link>
            </p>
            <p className="text-center text-[13px] text-neutral-400 mt-2">
              ¿Eres profesor independiente?{' '}
              <Link href="/unete" className="text-neutral-900 font-semibold hover:underline">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>

        {/* Propuesta de valor — panel oscuro, sin ilustración: distingue esta
            landing de /unete a simple vista y evita depender de un asset
            gráfico propio de academias que todavía no existe. */}
        <div className="relative shrink-0 lg:flex-1 bg-neutral-900 overflow-hidden flex flex-col lg:justify-center lg:px-14 lg:h-auto">
          {/* Mobile: compacto, solo copy */}
          <div className="lg:hidden px-5 py-5">
            <h2 className="text-[17px] font-black text-white tracking-tight leading-[1.2]">
              Gestiona tu academia y llega a más alumnos
            </h2>
          </div>

          {/* Copy desktop */}
          <div className="hidden lg:block relative z-10 lg:max-w-lg">
            <p className="text-[13px] font-bold uppercase tracking-wide mb-1.5 text-pink-200">Para academias</p>
            <h2 className="text-[46px] font-black text-white tracking-tight leading-[1.15] mb-5">
              Gestiona tu academia y llega a más alumnos
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
              <div className="inline-flex items-center gap-2 bg-white border border-neutral-900 rounded-full py-1.5 pl-2 pr-4">
                <span className="relative inline-flex w-2 h-2 rounded-full bg-green shrink-0">
                  <span className="absolute inset-0 rounded-full bg-green animate-ping" />
                </span>
                <span className="text-[12.5px] font-bold text-neutral-900">
                  <span className="text-pink-600">{teacherCount}+</span> profesores y academias ya publican en Kynea
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
