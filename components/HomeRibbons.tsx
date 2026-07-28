'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { trackAuthCtaClick } from '@/lib/analytics';

const TOP_DISMISS_KEY = 'kynea_dismissed_top_ribbon';
const BOTTOM_DISMISS_KEY = 'kynea_dismissed_bottom_ribbon';

// Visible only to logged-in users, inviting them back to browse classes —
// scrolls with the page (not fixed), sits above the header.
export function TopAnnouncementRibbon() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(TOP_DISMISS_KEY) === '1') return;
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) setShow(true);
    });
  }, []);

  if (!show) return null;

  function handleDismiss() {
    localStorage.setItem(TOP_DISMISS_KEY, '1');
    setShow(false);
  }

  return (
    <div className="relative bg-[#FFF3B0] border-b border-neutral-200 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] starting:-translate-y-full">
      <div className="max-w-[1200px] mx-auto px-10 py-2.5 text-center">
        <p className="font-sans text-[14px] font-semibold text-neutral-900">
          🎉 ¡Bienvenido de vuelta a Kynea! Descubre tu próxima clase de baile.{' '}
          <Link href="/clases" className="font-sans text-pink-600 underline underline-offset-2 hover:text-pink-800">
            Explorar clases
          </Link>
        </p>
      </div>
      <button
        onClick={handleDismiss}
        aria-label="Cerrar aviso"
        className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-black/5 active:scale-90 transition-[background-color,transform]"
      >
        <X className="w-4 h-4 text-neutral-900" />
      </button>
    </div>
  );
}

// Visible only to logged-out users, inviting them to sign up — fixed to the
// bottom of the viewport, disappears for good once dismissed or once they log in.
export function BottomSignupRibbon() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(BOTTOM_DISMISS_KEY) === '1') return;
    createClient().auth.getUser().then(({ data }) => {
      if (!data.user) setShow(true);
    });
  }, []);

  if (!show) return null;

  function handleDismiss() {
    localStorage.setItem(BOTTOM_DISMISS_KEY, '1');
    setShow(false);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-pink-100 border-t border-neutral-200 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] starting:translate-y-full">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
        <button
          onClick={handleDismiss}
          aria-label="Cerrar aviso"
          className="self-start sm:self-center shrink-0 order-first p-1.5 rounded-md hover:bg-black/10 active:scale-90 transition-[background-color,transform]"
        >
          <X className="w-4 h-4 text-neutral-900" />
        </button>
        <div className="flex items-center gap-3 w-full sm:w-auto sm:flex-1 min-w-0">
          <span className="hidden sm:inline text-2xl shrink-0" aria-hidden="true">💃</span>
          <div className="min-w-0">
            <p className="font-sans text-[15px] font-bold text-neutral-900 leading-snug">¿Listo para bailar?</p>
            <p className="font-figtree text-[13px] text-pink-600 leading-snug">
              Crea tu cuenta gratis para conectar con tu primera clase de baile.
            </p>
          </div>
        </div>
        <Link
          href="/registro"
          onClick={() => trackAuthCtaClick({ action: 'registro', location: 'home_bottom_ribbon' })}
          className="font-sans w-full sm:w-auto text-center text-[14px] font-bold text-white bg-neutral-900 border border-neutral-900 rounded-full px-5 py-2.5 hover:bg-neutral-800 transition-colors active:scale-[0.97] whitespace-nowrap"
        >
          Registrarme gratis
        </Link>
      </div>
    </div>
  );
}
