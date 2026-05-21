'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Globe } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { email: 'alumno@kynea.pe', password: 'demo1234', label: 'Alumno demo', redirect: '/clases' },
  { email: 'profesor@kynea.pe', password: 'demo1234', label: 'Profesor demo', redirect: '/dashboard' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const match = DEMO_ACCOUNTS.find(a => a.email === email && a.password === password);
    if (match) {
      window.location.href = match.redirect;
    } else {
      setError('Correo o contraseña incorrectos. Usa las cuentas demo de abajo.');
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-white border-b border-neutral-200 px-6 py-4">
        <Link href="/">
          <Image src="/logo.svg" alt="Kynea" width={90} height={30} priority />
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
            <h1 className="text-[24px] font-black text-neutral-900 tracking-snug mb-1">Iniciar sesión</h1>
            <p className="text-[15px] text-neutral-500 mb-6">Bienvenido de vuelta a Kynea</p>

            {/* Demo accounts */}
            <div className="bg-yellow-bg border border-yellow-dark/30 rounded-xl p-4 mb-6">
              <p className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider mb-2">Acceso demo — sin registro</p>
              <div className="flex gap-2">
                {DEMO_ACCOUNTS.map(a => (
                  <button
                    key={a.email}
                    onClick={() => { window.location.href = a.redirect; }}
                    className="flex-1 text-[13px] font-semibold bg-white border border-neutral-200 hover:border-neutral-900 text-neutral-800 py-2 rounded-md transition-all"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <button className="w-full btn-outline mb-4">
              <Globe className="w-4 h-4" />
              Continuar con Google
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-neutral-200" />
              <span className="text-[13px] text-neutral-400">o con correo</span>
              <div className="flex-1 h-px bg-neutral-200" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="bg-red-bg border-l-4 border-red text-[13px] font-medium px-4 py-3 rounded-lg text-red-700">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-[13px] font-semibold text-neutral-700 mb-1.5">Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  className="input"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[13px] font-semibold text-neutral-700">Contraseña</label>
                  <button type="button" className="text-[13px] text-neutral-900 font-semibold hover:underline">¿Olvidaste tu contraseña?</button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  required
                  className="input"
                />
              </div>

              <button type="submit" className="btn-dark w-full mt-1">
                Iniciar sesión
              </button>
            </form>

            <p className="text-center text-[13px] text-neutral-400 mt-5">
              ¿No tienes cuenta?{' '}
              <Link href="/registro" className="text-neutral-900 font-semibold hover:underline">
                Regístrate gratis
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
