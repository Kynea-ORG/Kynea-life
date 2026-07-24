'use client';
import { useState } from 'react';
import { Shield, Globe, Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const SECTIONS = [
  {
    icon: Globe, title: 'Visibilidad', desc: 'Controla cómo apareces en el buscador',
    settings: [
      { label: 'Aparecer en búsquedas públicas', default: true },
      { label: 'Mostrar mi número de WhatsApp', default: true },
      { label: 'Mostrar número de cupos disponibles', default: true },
      { label: 'Permitir compartir mis clases', default: true },
    ],
  },
];

function getPasswordErrorMessage(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('same password') || m.includes('different from the old'))
    return 'La nueva contraseña debe ser diferente a la anterior.';
  if (m.includes('weak') || m.includes('too short'))
    return 'La contraseña es muy débil. Usa al menos 8 caracteres.';
  if (m.includes('invalid login credentials'))
    return 'La contraseña actual no es correcta.';
  return 'No se pudo actualizar la contraseña. Intenta de nuevo.';
}

function ChangePasswordForm() {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const confirmMismatch = confirm.length > 0 && password !== confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    setError('');
    setSuccess(false);
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setError('No se pudo verificar tu sesión. Vuelve a iniciar sesión.');
      setLoading(false);
      return;
    }

    // supabase-js has no "verify current password" call — re-authenticate
    // with it instead, so a shared/left-open session can't be used to lock
    // the real owner out (relevant here: every teacher account we created
    // for them currently shares the same starter password).
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    });
    if (signInError) {
      setError(getPasswordErrorMessage(signInError.message));
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(getPasswordErrorMessage(updateError.message));
      setLoading(false);
      return;
    }

    setCurrent('');
    setPassword('');
    setConfirm('');
    setSuccess(true);
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-bg border-l-4 border-red text-[13px] font-medium px-4 py-3 rounded-lg text-red-700 animate-fade-in">
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-bg border-l-4 border-green text-[13px] font-medium px-4 py-3 rounded-lg text-green-text animate-fade-in">
          <Check className="w-4 h-4 shrink-0" /> Contraseña actualizada.
        </div>
      )}
      <div>
        <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Contraseña actual</label>
        <div className="relative">
          <input
            type={showCurrent ? 'text' : 'password'}
            value={current}
            onChange={e => setCurrent(e.target.value)}
            required
            className="input pr-11"
          />
          <button
            type="button"
            onClick={() => setShowCurrent(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Nueva contraseña</label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
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
      </div>
      <div>
        <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Confirmar nueva contraseña</label>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            className={`input pr-11 ${confirmMismatch ? 'border-red-400 focus:border-red-400' : ''}`}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {confirmMismatch && (
          <p className="text-xs text-red-500 mt-1 animate-fade-in">Las contraseñas no coinciden</p>
        )}
      </div>
      <button
        type="submit"
        disabled={loading || confirmMismatch}
        className="btn-dark flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Guardando…' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}

export default function ConfiguracionPage() {
  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-neutral-900">Configuración</h1>
        <p className="text-neutral-500 text-sm mt-1">Administra tus preferencias y seguridad</p>
      </div>

      <div className="space-y-6">
        {SECTIONS.map(section => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center">
                  <Icon className="w-5 h-5 text-neutral-900" />
                </div>
                <div>
                  <h2 className="font-bold text-neutral-900">{section.title}</h2>
                  <p className="text-xs text-neutral-500">{section.desc}</p>
                </div>
              </div>
              <div className="space-y-4">
                {section.settings.map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-sm text-neutral-700">{s.label}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={s.default} className="sr-only peer" />
                      <div className="w-10 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:bg-neutral-900" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-neutral-900" />
            </div>
            <div>
              <h2 className="font-bold text-neutral-900">Privacidad y seguridad</h2>
              <p className="text-xs text-neutral-500">Gestiona tu contraseña y datos personales</p>
            </div>
          </div>
          <ChangePasswordForm />
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-neutral-100">
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-400">Autenticación en dos pasos</span>
              <span className="text-[10px] font-bold uppercase tracking-wide bg-neutral-100 text-neutral-400 rounded-full px-1.5 py-0.5">
                Próximamente
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-not-allowed">
              <input type="checkbox" checked={false} disabled readOnly className="sr-only peer" />
              <div className="w-10 h-5 bg-neutral-100 rounded-full opacity-60 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4" />
            </label>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-red-50 rounded-xl border border-red-100 p-6">
          <h2 className="font-bold text-red-700 mb-2">Zona de peligro</h2>
          <p className="text-sm text-red-600 mb-4">Estas acciones son irreversibles. Procede con cuidado.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button className="text-sm font-semibold text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-100 transition-colors active:scale-[0.97]">
              Eliminar todas mis clases
            </button>
            <button className="text-sm font-semibold text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl transition-colors active:scale-[0.97]">
              Eliminar mi cuenta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
