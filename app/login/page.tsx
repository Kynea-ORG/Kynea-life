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

  function loginAs(account: typeof DEMO_ACCOUNTS[0]) {
    window.location.href = account.redirect;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-5 py-4">
        <Link href="/">
          <Image src="/logo.svg" alt="Kynea" width={90} height={30} priority />
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <h1 className="text-2xl font-black text-gray-900 mb-1">Iniciar sesión</h1>
            <p className="text-sm text-gray-500 mb-6">Bienvenido de vuelta a Kynea</p>

            {/* Demo accounts */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
              <p className="text-xs font-bold text-amber-800 mb-2">Acceso demo — sin registro</p>
              <div className="flex gap-2">
                {DEMO_ACCOUNTS.map(a => (
                  <button
                    key={a.email}
                    onClick={() => loginAs(a)}
                    className="flex-1 text-xs font-semibold bg-white border border-amber-200 hover:border-amber-400 text-amber-800 py-2 rounded-xl transition-colors"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <button className="w-full flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-3 rounded-full text-sm transition-colors mb-4">
              <Globe className="w-4 h-4" />
              Continuar con Google
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">o con correo</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-medium px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700">Contraseña</label>
                  <button type="button" className="text-xs text-purple-600 hover:underline">¿Olvidaste tu contraseña?</button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-3.5 rounded-full text-sm transition-colors mt-1"
              >
                Iniciar sesión
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-5">
              ¿No tienes cuenta?{' '}
              <Link href="/registro" className="text-purple-700 font-semibold hover:underline">
                Regístrate gratis
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
