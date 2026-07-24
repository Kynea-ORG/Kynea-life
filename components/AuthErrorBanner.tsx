'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, X } from 'lucide-react';

function AuthErrorBannerInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const errorCode = searchParams.get('error_code');
  const errorParam = searchParams.get('error');
  const show = !dismissed && !!(errorParam || errorCode);

  if (!show) return null;

  const expired = errorCode === 'otp_expired';
  const message = expired
    ? 'El enlace de confirmación expiró o ya fue usado. Solicita uno nuevo desde la pantalla de confirmación.'
    : 'No pudimos completar la verificación. Intenta registrarte o iniciar sesión de nuevo.';

  function dismiss() {
    setDismissed(true);
    // Limpia los parámetros de error de la URL
    router.replace('/');
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md animate-fade-in">
      <div className="bg-white border border-red-200 shadow-lg rounded-xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-red-bg flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-neutral-900">Enlace no válido</p>
          <p className="text-[13px] text-neutral-500 mt-0.5">{message}</p>
          <div className="flex gap-3 mt-3">
            <Link
              href="/registro"
              className="text-[13px] font-semibold text-neutral-900 hover:underline"
              onClick={() => setDismissed(true)}
            >
              Crear cuenta
            </Link>
            <Link
              href="/login"
              className="text-[13px] font-semibold text-neutral-500 hover:text-neutral-700"
              onClick={() => setDismissed(true)}
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
        <button onClick={dismiss} className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors active:scale-90 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function AuthErrorBanner() {
  return (
    <Suspense fallback={null}>
      <AuthErrorBannerInner />
    </Suspense>
  );
}
