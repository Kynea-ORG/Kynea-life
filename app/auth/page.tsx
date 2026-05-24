'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, Globe, Zap } from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    label: 'Academia Ritmo Latino',
    desc: 'Academia · 12 clases activas',
    emoji: '🏫',
    href: '/dashboard',
  },
  {
    label: 'Sofía Vega',
    desc: 'Profesora independiente · Heels & Jazz Funk',
    emoji: '💃',
    href: '/dashboard',
  },
];

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userType, setUserType] = useState<'alumno' | 'profesor'>('alumno');
  const [authMode, setAuthMode] = useState<'login' | 'register'>(
    searchParams.get('tab') === 'register' ? 'register' : 'login'
  );
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '', terms: false });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userType === 'profesor') {
      if (authMode === 'register') {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }
    } else {
      router.push('/buscar');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image src="/logo.png" alt="Kynea" width={100} height={32} />
          </Link>
          <p className="text-neutral-500 mt-2 text-sm">Donde la pasión por la danza cobra vida</p>
        </div>

        {/* Demo access card */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-bold text-amber-800">Acceso demo — sin registro</span>
          </div>
          <p className="text-xs text-amber-700 mb-3">Entra directamente al panel de profesor para explorar todas las funciones.</p>
          <div className="flex flex-col gap-2">
            {DEMO_ACCOUNTS.map(acc => (
              <Link
                key={acc.label}
                href={acc.href}
                className="flex items-center gap-3 bg-white border border-amber-200 hover:border-amber-400 rounded-xl px-4 py-3 transition-colors group"
              >
                <span className="text-xl">{acc.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-neutral-900 group-hover:underline transition-colors">{acc.label}</p>
                  <p className="text-xs text-neutral-500">{acc.desc}</p>
                </div>
                <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-1 rounded-lg">Demo</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* User type tabs */}
          <div className="flex border-b border-neutral-100">
            {(['alumno', 'profesor'] as const).map(type => (
              <button
                key={type}
                onClick={() => setUserType(type)}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                  userType === type
                    ? 'text-neutral-900 border-b-2 border-neutral-900 bg-neutral-50/50'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {type === 'alumno' ? '🕺 Soy alumno' : '🎓 Soy profesor / academia'}
              </button>
            ))}
          </div>

          <div className="p-8">
            {/* Auth mode toggle */}
            <div className="flex bg-neutral-100 rounded-xl p-1 mb-6">
              {(['login', 'register'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setAuthMode(mode)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    authMode === mode ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
                  }`}
                >
                  {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                </button>
              ))}
            </div>

            {/* Google button */}
            <button
              onClick={() => userType === 'profesor' ? router.push('/dashboard') : router.push('/buscar')}
              className="w-full flex items-center justify-center gap-3 border-2 border-neutral-200 hover:border-neutral-900 hover:bg-neutral-100 text-neutral-700 font-semibold py-3 rounded-btn transition-colors mb-4"
            >
              <Globe className="w-5 h-5" />
              Continuar con Google
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-neutral-100" />
              <span className="text-xs text-neutral-400">o con correo</span>
              <div className="flex-1 h-px bg-neutral-100" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Nombre completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Tu nombre"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800 outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-100 transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Correo electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="tu@correo.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800 outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-100 transition-all"
                />
              </div>

              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Celular / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="+51 999 999 999"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800 outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-100 transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800 outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-100 transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Confirmar contraseña</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={form.confirm}
                      onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                      className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800 outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-100 transition-all"
                    />
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={form.terms}
                      onChange={e => setForm(f => ({ ...f, terms: e.target.checked }))}
                      className="mt-1 accent-neutral-900"
                    />
                    <span className="text-xs text-neutral-600">
                      Acepto los{' '}
                      <Link href="#" className="text-neutral-900 underline">términos y condiciones</Link>
                      {' '}y la{' '}
                      <Link href="#" className="text-neutral-900 underline">política de privacidad</Link>
                    </span>
                  </label>
                </>
              )}

              <button
                type="submit"
                className="w-full bg-neutral-900 hover:bg-neutral-700 text-white font-bold py-3.5 rounded-btn transition-colors mt-2"
              >
                {authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            </form>

            {userType === 'profesor' && (
              <p className="text-center text-xs text-neutral-600 mt-3 font-medium">
                {authMode === 'login' ? '→ Serás llevado a tu panel de gestión' : '→ Completarás tu perfil en el siguiente paso'}
              </p>
            )}

            <p className="text-center text-xs text-neutral-500 mt-4">
              {authMode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-neutral-900 font-semibold hover:underline"
              >
                {authMode === 'login' ? 'Regístrate' : 'Inicia sesión'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-50 flex items-center justify-center"><div className="text-neutral-500">Cargando...</div></div>}>
      <AuthContent />
    </Suspense>
  );
}
