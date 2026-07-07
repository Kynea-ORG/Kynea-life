'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { redirectByRole } from '@/lib/auth/redirectByRole';

function getResetErrorMessage(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('same password') || m.includes('different from the old'))
    return 'La nueva contraseña debe ser diferente a la anterior.';
  if (m.includes('weak') || m.includes('too short'))
    return 'La contraseña es muy débil. Usa al menos 8 caracteres.';
  if (m.includes('expired') || m.includes('invalid'))
    return 'El enlace expiró o no es válido. Solicita uno nuevo.';
  return 'No se pudo actualizar la contraseña. Intenta de nuevo.';
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRecovery = searchParams.get('recovery') === '1';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionCheck, setSessionCheck] = useState<boolean | null>(null);

  const confirmMismatch = confirm.length > 0 && password !== confirm;
  const hasSession = isRecovery ? sessionCheck : false;

  useEffect(() => {
    if (!isRecovery) return;
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (!session) { setSessionCheck(false); return; }
      // Verify session was created recently (< 10 min) to reject pre-existing sessions
      try {
        const payload = JSON.parse(atob(session.access_token.split('.')[1]));
        setSessionCheck(Date.now() / 1000 - payload.iat < 600);
      } catch {
        setSessionCheck(false);
      }
    });
  }, [isRecovery]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(getResetErrorMessage(updateError.message));
      setLoading(false);
      return;
    }

    await redirectByRole(supabase, {
      refresh: () => router.refresh(),
      onSuccess: (path) => router.push(path),
      onError: (msg) => { setError(msg); setLoading(false); },
    });
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
            {hasSession === null ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
              </div>
            ) : !hasSession ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <p className="text-[17px] font-black text-neutral-900">Enlace inválido o expirado</p>
                <p className="text-[14px] text-neutral-500">
                  Este enlace ya no es válido. Solicita un nuevo correo de recuperación desde el login.
                </p>
                <Link href="/login" className="btn-dark mt-2 inline-block px-6">
                  Ir al login
                </Link>
              </div>
            ) : (
              <>
                <h1 className="text-[24px] font-black text-neutral-900 tracking-snug mb-1">Nueva contraseña</h1>
                <p className="text-[15px] text-neutral-500 mb-6">Elige una contraseña segura para tu cuenta</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {error && (
                    <div className="bg-red-bg border-l-4 border-red text-[13px] font-medium px-4 py-3 rounded-lg text-red-700">
                      {error}
                    </div>
                  )}
                  <div>
                    <label className="block text-[13px] font-semibold text-neutral-700 mb-1.5">Nueva contraseña</label>
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
                    <label className="block text-[13px] font-semibold text-neutral-700 mb-1.5">Confirmar contraseña</label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        placeholder="Repite la contraseña"
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
                      <p className="text-[12px] text-red-500 mt-1">Las contraseñas no coinciden</p>
                    )}
                  </div>

                  <button type="submit" disabled={loading || confirmMismatch} className="btn-dark w-full mt-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? 'Guardando…' : 'Guardar contraseña'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
