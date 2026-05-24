'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Globe, User, BookOpen, Building2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Role = 'alumno' | 'profesor' | 'academia';

const ROLES: { key: Role; icon: React.ElementType; label: string; description: string }[] = [
  { key: 'alumno',   icon: User,      label: 'Alumno',   description: 'Busco clases de baile' },
  { key: 'profesor', icon: BookOpen,  label: 'Profesor', description: 'Doy clases individualmente' },
  { key: 'academia', icon: Building2, label: 'Academia', description: 'Tengo un estudio o academia' },
];

export default function RegistroPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('alumno');
  const [step, setStep] = useState<'role' | 'form'>('role');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { name: form.name, role } },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.refresh();
    router.push(role === 'alumno' ? '/clases' : '/dashboard');
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
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">

            {step === 'role' ? (
              <>
                <h1 className="text-[24px] font-black text-neutral-900 tracking-snug mb-1">Crear cuenta</h1>
                <p className="text-[15px] text-neutral-500 mb-6">¿Cómo quieres usar Kynea?</p>

                <div className="flex flex-col gap-3 mb-6">
                  {ROLES.map(r => {
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.key}
                        onClick={() => setRole(r.key)}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                          role === r.key
                            ? 'border-neutral-900 bg-neutral-50'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          role === r.key ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900 text-[15px]">{r.label}</p>
                          <p className="text-[13px] text-neutral-500">{r.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button onClick={() => setStep('form')} className="btn-dark w-full mb-4">
                  Continuar
                </button>

                <button className="w-full btn-outline">
                  <Globe className="w-4 h-4" />
                  Continuar con Google
                </button>

                <p className="text-center text-[13px] text-neutral-400 mt-5">
                  ¿Ya tienes cuenta?{' '}
                  <Link href="/login" className="text-neutral-900 font-semibold hover:underline">
                    Inicia sesión
                  </Link>
                </p>
              </>
            ) : (
              <>
                <button
                  onClick={() => setStep('role')}
                  className="text-[13px] text-neutral-400 hover:text-neutral-600 mb-5 transition-colors"
                >
                  ← Cambiar tipo de cuenta
                </button>

                <h1 className="text-[24px] font-black text-neutral-900 tracking-snug mb-1">
                  Cuenta de {ROLES.find(r => r.key === role)?.label}
                </h1>
                <p className="text-[15px] text-neutral-500 mb-6">Es gratis, sin tarjeta de crédito.</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {error && (
                    <div className="bg-red-bg border-l-4 border-red text-[13px] font-medium px-4 py-3 rounded-lg text-red-700">
                      {error}
                    </div>
                  )}
                  <div>
                    <label className="block text-[13px] font-semibold text-neutral-700 mb-1.5">
                      {role === 'academia' ? 'Nombre de la academia' : 'Nombre completo'}
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder={role === 'academia' ? 'Ej. Studio Ritmo Latino' : 'Tu nombre'}
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
                    <input
                      type="password"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Mínimo 8 caracteres"
                      minLength={8}
                      required
                      className="input"
                    />
                  </div>

                  <button type="submit" disabled={loading} className="btn-dark w-full mt-1 flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? 'Creando cuenta…' : 'Crear cuenta'}
                  </button>
                </form>

                <p className="text-center text-[13px] text-neutral-400 mt-5">
                  Al registrarte aceptas nuestros{' '}
                  <span className="text-neutral-900 font-semibold cursor-pointer hover:underline">Términos de uso</span>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
