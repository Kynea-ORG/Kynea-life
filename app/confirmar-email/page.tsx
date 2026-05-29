'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Loader2, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function ConfirmarEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');

  async function handleResend() {
    setResending(true);
    setError('');
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email });
    if (resendError) {
      setError(resendError.message);
    } else {
      setResent(true);
    }
    setResending(false);
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
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 text-center">
            <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-neutral-700" />
            </div>
            <h1 className="text-[24px] font-black text-neutral-900 tracking-snug mb-2">Confirma tu correo</h1>
            <p className="text-[15px] text-neutral-500 mb-1">
              Enviamos un enlace de activación a
            </p>
            {email && (
              <p className="text-[15px] font-semibold text-neutral-900 mb-5">{email}</p>
            )}
            <p className="text-[13px] text-neutral-400 mb-8">
              Haz clic en el enlace del correo para activar tu cuenta. Puede tardar unos minutos — revisa también el spam.
            </p>

            {error && (
              <div className="bg-red-bg border-l-4 border-red text-[13px] font-medium px-4 py-3 rounded-lg text-red-700 mb-4 text-left">
                {error}
              </div>
            )}

            {resent ? (
              <div className="bg-green-bg border border-green-dark/20 text-green-text text-[13px] font-semibold px-4 py-3 rounded-lg mb-4">
                ¡Correo reenviado! Revisa tu bandeja de entrada.
              </div>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="w-full btn-outline flex items-center justify-center gap-2 mb-4 disabled:opacity-60"
              >
                {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {resending ? 'Enviando…' : 'Reenviar correo'}
              </button>
            )}

            <Link
              href="/registro"
              className="text-[13px] text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              ← Volver y cambiar email
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmarEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-neutral-500 text-sm">Cargando…</div>
      </div>
    }>
      <ConfirmarEmailContent />
    </Suspense>
  );
}
