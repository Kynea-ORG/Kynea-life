'use client';
import { useRouter } from 'next/navigation';
import { GraduationCap, X } from 'lucide-react';
import { trackAuthCtaClick } from '@/lib/analytics';

// Upsell propio para un alumno logueado que quiere pasar a profesor —
// calca el patrón de conversión que ya existe para profesor -> academia
// (app/convertir-academia/), pero sin aprobación de admin: ver la decisión
// en el plan de esta feature (shimmering-stargazing-sun.md). Confirma acá
// antes de mandarlo al wizard de onboarding porque el cambio de rol no
// tiene vuelta atrás una vez completado (protect_profile_role, migración 45).
export default function BecomeTeacherModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  function handleConfirm() {
    trackAuthCtaClick({ action: 'registro', location: 'become_teacher_modal' });
    onClose();
    router.push('/onboarding?upgrade=profesor');
  }

  return (
    <div className="fixed inset-0 z-[70] bg-neutral-900/70 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-[24px] border border-neutral-900 shadow-2xl max-w-md w-full p-8 relative">
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors active:scale-90"
        >
          <X className="w-4 h-4 text-neutral-900" />
        </button>

        <div className="w-12 h-12 rounded-xl bg-primary-bg flex items-center justify-center mb-4">
          <GraduationCap className="w-6 h-6 text-primary" />
        </div>

        <h2 className="text-2xl font-black text-neutral-900 tracking-tight mb-2">
          ¿Quieres enseñar en Kynea?
        </h2>
        <p className="text-[15px] text-neutral-600 leading-relaxed mb-6">
          Vas a completar un registro corto de profesor y vas a poder publicar tus propias clases.
          Tu cuenta de alumno pasa a ser de profesor — este cambio no se puede deshacer después.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-btn border border-neutral-200 text-neutral-700 font-semibold text-[15px] hover:bg-neutral-50 transition-colors active:scale-[0.97]"
          >
            Ahora no
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3.5 rounded-btn bg-neutral-900 text-white font-bold text-[15px] hover:bg-neutral-800 transition-colors active:scale-[0.97]"
          >
            Sí, quiero enseñar
          </button>
        </div>
      </div>
    </div>
  );
}
