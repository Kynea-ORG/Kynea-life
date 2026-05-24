'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function Redirector() {
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    const qs = params.toString();
    router.replace(`/clases${qs ? `?${qs}` : ''}`);
  }, [params, router]);
  return (
    <div className="min-h-screen flex items-center justify-center text-neutral-400 text-sm">
      Redirigiendo…
    </div>
  );
}

export default function BuscarPage() {
  return (
    <Suspense fallback={null}>
      <Redirector />
    </Suspense>
  );
}
