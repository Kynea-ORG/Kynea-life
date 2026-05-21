'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Globe, User, BookOpen, Building2 } from 'lucide-react';

type Role = 'alumno' | 'profesor' | 'academia';

const ROLES: { key: Role; icon: React.ElementType; label: string; description: string }[] = [
  { key: 'alumno', icon: User, label: 'Alumno', description: 'Busco clases de baile' },
  { key: 'profesor', icon: BookOpen, label: 'Profesor', description: 'Doy clases individualmente' },
  { key: 'academia', icon: Building2, label: 'Academia', description: 'Tengo un estudio o academia' },
];

export default function RegistroPage() {
  const [role, setRole] = useState<Role>('alumno');
  const [step, setStep] = useState<'role' | 'form'>('role');
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const redirect = role === 'alumno' ? '/clases' : '/dashboard';
    window.location.href = redirect;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-5 py-4">
        <Link href="/">
          <Image src="/logo.svg" alt="Kynea" width={90} height={30} priority />
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">

            {step === 'role' ? (
              <>
                <h1 className="text-2xl font-black text-gray-900 mb-1">Crear cuenta</h1>
                <p className="text-sm text-gray-500 mb-6">¿Cómo quieres usar Kynea?</p>

                <div className="flex flex-col gap-3 mb-6">
                  {ROLES.map(r => {
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.key}
                        onClick={() => setRole(r.key)}
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                          role === r.key
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          role === r.key ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{r.label}</p>
                          <p className="text-xs text-gray-500">{r.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setStep('form')}
                  className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-3.5 rounded-full text-sm transition-colors mb-4"
                >
                  Continuar
                </button>

                <button className="w-full flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-3 rounded-full text-sm transition-colors">
                  <Globe className="w-4 h-4" />
                  Continuar con Google
                </button>

                <p className="text-center text-xs text-gray-400 mt-5">
                  ¿Ya tienes cuenta?{' '}
                  <Link href="/login" className="text-purple-700 font-semibold hover:underline">
                    Inicia sesión
                  </Link>
                </p>
              </>
            ) : (
              <>
                <button
                  onClick={() => setStep('role')}
                  className="text-xs text-gray-400 hover:text-gray-600 mb-5 transition-colors"
                >
                  ← Cambiar tipo de cuenta
                </button>

                <h1 className="text-2xl font-black text-gray-900 mb-1">
                  Crea tu cuenta de {ROLES.find(r => r.key === role)?.label}
                </h1>
                <p className="text-sm text-gray-500 mb-6">Es gratis, sin tarjeta de crédito.</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      {role === 'academia' ? 'Nombre de la academia' : 'Nombre completo'}
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder={role === 'academia' ? 'Ej. Studio Ritmo Latino' : 'Tu nombre'}
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Correo electrónico</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="tu@correo.com"
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Contraseña</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Mínimo 8 caracteres"
                      minLength={8}
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-3.5 rounded-full text-sm transition-colors mt-1"
                  >
                    Crear cuenta
                  </button>
                </form>

                <p className="text-center text-xs text-gray-400 mt-5">
                  Al registrarte aceptas nuestros{' '}
                  <span className="text-purple-700 font-semibold cursor-pointer">Términos de uso</span>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
