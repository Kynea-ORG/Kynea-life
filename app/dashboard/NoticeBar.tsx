'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { X } from 'lucide-react';

const NOTICES: Record<string, { title: string; body: string }> = {
  cuenta_existente: {
    title: 'Ya tienes una cuenta',
    body: 'Encontramos una cuenta existente con este correo. Ingresaste con tu perfil actual.',
  },
};

export default function NoticeBar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(() => {
    const key = searchParams.get('notice');
    return key && NOTICES[key] ? NOTICES[key] : null;
  });

  useEffect(() => {
    const key = searchParams.get('notice');
    if (key && NOTICES[key]) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('notice');
      const clean = params.size > 0 ? `${pathname}?${params}` : pathname;
      router.replace(clean);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!notice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
        <button
          onClick={() => setNotice(null)}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h3 className="text-[17px] font-black text-neutral-900 mb-2">{notice.title}</h3>
        <p className="text-[14px] text-neutral-500 leading-relaxed mb-5">{notice.body}</p>
        <button
          onClick={() => setNotice(null)}
          className="w-full bg-neutral-900 hover:bg-neutral-700 text-white font-bold py-3 rounded-xl text-sm transition-colors"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
