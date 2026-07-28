'use client';
import { useState } from 'react';
import { BookOpen, Building2, Check, CheckCircle, Copy, Eye, EyeOff, Loader2 } from 'lucide-react';
import { createUserAsAdmin } from '@/lib/admin/actions';

type Role = 'profesor' | 'academia';

// Contraseña inicial compartida que se le entrega al profesor; la cambia
// desde /dashboard/configuracion. No es un secreto: se muestra en pantalla.
const DEFAULT_PASSWORD = 'Kynea2026!';

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-neutral-400 hover:text-neutral-600 transition-colors shrink-0"
    >
      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

export default function CrearUsuarioClient() {
  const [role, setRole] = useState<Role>('profesor');
  const [form, setForm] = useState({ name: '', email: '', password: DEFAULT_PASSWORD });
  const [showPass, setShowPass] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ name: string; email: string; password: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await createUserAsAdmin({ name: form.name, email: form.email, password: form.password, role: 'profesor' });
      if (!res.ok) {
        setError(res.error);
      } else {
        setCreated({ name: res.name, email: res.email, password: res.password });
      }
    } catch {
      // No leemos e.message a propósito: en producción Next.js reemplaza el
      // mensaje real de un Server Function por un digest opaco (ver
      // sdd/admin-create-user/design ADR-3).
      setError('No se pudo crear la cuenta. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function handleCreateAnother() {
    setCreated(null);
    setForm({ name: '', email: '', password: DEFAULT_PASSWORD });
    setError('');
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-neutral-900">Crear usuario</h1>
        <p className="text-neutral-500 text-sm mt-1">Crea una cuenta de profesor lista para usar de inmediato, sin confirmar correo.</p>
      </div>

      {created ? (
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-green-bg rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-text" />
            </div>
            <div>
              <h2 className="font-bold text-neutral-900">Cuenta creada</h2>
              <p className="text-xs text-neutral-500">{created.name}</p>
            </div>
          </div>

          <div className="bg-green-bg border-l-4 border-green text-[13px] font-medium px-4 py-3 rounded-lg text-green-text mb-4">
            La cuenta ya está activa — puede iniciar sesión de inmediato, no hace falta confirmar el correo.
          </div>

          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between gap-3 bg-neutral-50 rounded-lg px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Correo</p>
                <p className="text-sm font-semibold text-neutral-900 truncate">{created.email}</p>
              </div>
              <CopyButton value={created.email} />
            </div>
            <div className="flex items-center justify-between gap-3 bg-neutral-50 rounded-lg px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Contraseña</p>
                <p className="text-sm font-semibold text-neutral-900 truncate">{created.password}</p>
              </div>
              <CopyButton value={created.password} />
            </div>
          </div>

          <div className="bg-red-bg border-l-4 border-red text-[13px] font-medium px-4 py-3 rounded-lg text-red-700 mb-5">
            Guarda o comparte estos datos ahora — la contraseña no se vuelve a mostrar si recargas la página.
          </div>

          <button type="button" onClick={handleCreateAnother} className="btn-primary w-full">
            Crear otra
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6 flex flex-col gap-4">
          {error && (
            <div className="bg-red-bg border-l-4 border-red text-[13px] font-medium px-4 py-3 rounded-lg text-red-700 animate-fade-in">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[13px] font-semibold text-neutral-700 mb-1.5">Nombre completo</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Nombre del profesor"
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
              placeholder="profesor@correo.com"
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
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-neutral-700 mb-1.5">Tipo de cuenta</label>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setRole('profesor')}
                className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-[border-color,background-color] active:scale-[0.98] ${
                  role === 'profesor' ? 'border-primary bg-primary-bg' : 'border-neutral-200 hover:border-neutral-400'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  role === 'profesor' ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-500'
                }`}>
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-neutral-900 text-[15px]">Profesor</p>
                  <p className="text-[13px] text-neutral-500">Da clases de manera independiente</p>
                </div>
              </button>

              <button
                type="button"
                disabled
                aria-disabled="true"
                onClick={() => {}}
                className="flex items-center gap-4 p-4 rounded-xl border border-neutral-200 text-left opacity-50 cursor-not-allowed"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-neutral-100 text-neutral-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-neutral-900 text-[15px]">Academia</p>
                  <p className="text-[13px] text-neutral-500">Gestiona un estudio o academia</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wide bg-neutral-100 text-neutral-400 rounded-full px-2 py-1 shrink-0">
                  No disponible
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-1 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>
      )}
    </div>
  );
}
