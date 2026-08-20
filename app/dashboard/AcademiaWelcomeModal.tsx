'use client';
import { useState } from 'react';
import { LayoutGrid, Star, Building2, ImageIcon, Loader2 } from 'lucide-react';
import { dismissAcademiaWelcome } from '@/lib/profiles/actions';

const BENEFITS = [
  { Icon: LayoutGrid,  text: 'Publica todas tus clases sin restricción' },
  { Icon: Star,        text: 'Apareces en la sección destacada "Academias" del home' },
  { Icon: Building2,   text: 'Badge distintivo de Academia en tu perfil público' },
  { Icon: ImageIcon,   text: 'Portada, equipo y sedes en tu perfil — más profesional' },
];

// Se muestra una sola vez, la primera vez que una academia recién aprobada
// abre su dashboard — ver migración 42 (academia_welcome_seen_at) y
// dashboard/layout.tsx, que decide cuándo montar este componente.
export default function AcademiaWelcomeModal({ name }: { name: string }) {
  const [open, setOpen] = useState(true);
  const [dismissing, setDismissing] = useState(false);
  const firstName = name.split(' ')[0] || 'academia';

  async function handleDismiss() {
    setDismissing(true);
    setOpen(false);
    try {
      await dismissAcademiaWelcome();
    } catch {
      // Si falla, el modal ya se cerró localmente — no bloqueamos al usuario
      // por esto. Volverá a aparecer en la próxima visita, que es un
      // trade-off aceptable frente a dejarlo atascado en la pantalla.
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/70 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-[24px] border border-neutral-900 shadow-2xl max-w-md w-full p-8 text-center">
        <p className="text-5xl mb-3">🎉</p>
        <h2 className="text-2xl font-black text-neutral-900 tracking-tight mb-1.5">
          ¡Felicidades, {firstName}!
        </h2>
        <p className="text-[15px] text-neutral-500 mb-6">
          Tu academia fue aprobada — ya eres parte de Kynea como academia.
        </p>

        <ul className="flex flex-col gap-3 text-left mb-7">
          {BENEFITS.map(({ Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <div className="w-8 h-8 bg-pink-50 rounded-lg flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-pink-600" />
              </div>
              <span className="text-[14px] font-semibold text-neutral-800 leading-snug pt-1">{text}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={handleDismiss}
          disabled={dismissing}
          className="btn-dark w-full flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {dismissing && <Loader2 className="w-4 h-4 animate-spin" />}
          Empezar a publicar
        </button>
      </div>
    </div>
  );
}
