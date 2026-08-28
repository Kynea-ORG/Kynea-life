'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Globe, Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { updateProfile } from '@/lib/profiles/actions';
import { deleteAccount } from '@/lib/auth/actions';
import { useDelayedUnmount } from '@/lib/hooks/useDelayedUnmount';
import ErrorBanner from '@/components/ErrorBanner';

type Role = 'alumno' | 'profesor' | 'academia';

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
      {error && <ErrorBanner>{error}</ErrorBanner>}
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
            className={`input pr-11 ${confirmMismatch ? 'border-red focus:border-red' : ''}`}
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
          <p className="text-xs text-red mt-1 animate-fade-in">Las contraseñas no coinciden</p>
        )}
      </div>
      <button
        type="submit"
        disabled={loading || confirmMismatch}
        className="btn-dark flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Guardando…' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}

export default function ConfiguracionClient({
  role,
  showWhatsapp: initialShowWhatsapp,
  showSpots: initialShowSpots,
}: {
  role: Role;
  showWhatsapp: boolean;
  showSpots: boolean;
}) {
  const router = useRouter();
  const isTeacher = role !== 'alumno';
  const [showWhatsapp, setShowWhatsapp] = useState(initialShowWhatsapp);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [showSpots, setShowSpots] = useState(initialShowSpots);
  const [savingSpots, setSavingSpots] = useState(false);

  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const shouldRenderToast = useDelayedUnmount(toastOpen, 200);

  useEffect(() => {
    if (!toastOpen) return;
    const timer = setTimeout(() => setToastOpen(false), 3000);
    return () => clearTimeout(timer);
  }, [toastOpen]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setToastOpen(true);
  };

  async function handleToggleWhatsapp(checked: boolean) {
    const previous = showWhatsapp;
    setShowWhatsapp(checked);
    setSavingWhatsapp(true);
    try {
      await updateProfile({ show_whatsapp: checked });
      showToast(
        checked ? 'Tu WhatsApp ahora es visible en tu perfil público.' : 'Tu WhatsApp ya no aparece en tu perfil público.',
        'success'
      );
    } catch (err) {
      setShowWhatsapp(previous);
      showToast(err instanceof Error ? err.message : 'No se pudo guardar el cambio.', 'error');
    } finally {
      setSavingWhatsapp(false);
    }
  }

  async function handleToggleSpots(checked: boolean) {
    const previous = showSpots;
    setShowSpots(checked);
    setSavingSpots(true);
    try {
      await updateProfile({ show_spots: checked });
      showToast(
        checked ? 'El número de cupos ahora es visible en tus clases.' : 'El número de cupos ya no aparece en tus clases.',
        'success'
      );
    } catch (err) {
      setShowSpots(previous);
      showToast(err instanceof Error ? err.message : 'No se pudo guardar el cambio.', 'error');
    } finally {
      setSavingSpots(false);
    }
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    try {
      await deleteAccount();
      router.push('/');
      router.refresh();
    } catch (err) {
      setDeletingAccount(false);
      setConfirmDeleteAccount(false);
      showToast(err instanceof Error ? err.message : 'No se pudo eliminar la cuenta.', 'error');
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      {shouldRenderToast && toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold transition-[opacity,transform] duration-200 ease-out ${
          toastOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        } ${
          toast.type === 'error' ? 'bg-red text-white' : 'bg-neutral-900 text-white'
        }`}>
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-black text-neutral-900">Configuración</h1>
        <p className="text-neutral-600 text-sm mt-1">Administra tus preferencias y seguridad</p>
      </div>

      <div className="space-y-6">
        {isTeacher && (
          <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center">
                <Globe className="w-5 h-5 text-neutral-900" />
              </div>
              <div>
                <h2 className="font-bold text-neutral-900">Visibilidad</h2>
                <p className="text-xs text-neutral-600">Controla cómo apareces en el buscador</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-700">Mostrar mi número de WhatsApp</span>
                <label className={`relative inline-flex items-center ${savingWhatsapp ? 'cursor-wait' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={showWhatsapp}
                    disabled={savingWhatsapp}
                    onChange={e => handleToggleWhatsapp(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:bg-neutral-900 peer-disabled:opacity-60" />
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-700">Mostrar número de cupos disponibles</span>
                <label className={`relative inline-flex items-center ${savingSpots ? 'cursor-wait' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={showSpots}
                    disabled={savingSpots}
                    onChange={e => handleToggleSpots(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:bg-neutral-900 peer-disabled:opacity-60" />
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-neutral-900" />
            </div>
            <div>
              <h2 className="font-bold text-neutral-900">Privacidad y seguridad</h2>
              <p className="text-xs text-neutral-600">Gestiona tu contraseña y datos personales</p>
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
        <div className="bg-red-bg rounded-xl border border-red p-6">
          <h2 className="font-bold text-red-text mb-2">Zona de peligro</h2>
          <p className="text-sm text-red mb-4">Esta acción es irreversible. Procede con cuidado.</p>
          {confirmDeleteAccount ? (
            <div className="flex items-center gap-3 flex-wrap animate-fade-in">
              <span className="text-sm font-semibold text-red-text">¿Seguro que quieres eliminar tu cuenta? Se borrará todo tu contenido.</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  className="text-sm font-semibold text-white bg-red hover:bg-red-dark px-4 py-2 rounded-xl transition-colors active:scale-[0.97] disabled:opacity-60 flex items-center gap-2"
                >
                  {deletingAccount && <Loader2 className="w-4 h-4 animate-spin" />}
                  {deletingAccount ? 'Eliminando…' : 'Sí, eliminar mi cuenta'}
                </button>
                <button
                  onClick={() => setConfirmDeleteAccount(false)}
                  disabled={deletingAccount}
                  className="text-sm font-semibold text-neutral-600 hover:text-neutral-900 px-4 py-2 rounded-xl transition-colors active:scale-[0.97] disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDeleteAccount(true)}
              className="text-sm font-semibold text-white bg-red hover:bg-red-dark px-4 py-2 rounded-xl transition-colors active:scale-[0.97]"
            >
              Eliminar mi cuenta
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
