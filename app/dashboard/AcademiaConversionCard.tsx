import Link from 'next/link';
import { Building2 } from 'lucide-react';

type ConversionStatus = 'pending' | 'approved' | 'rejected' | null;

// Lives on the dashboard home (not Configuración) on purpose — a profesor
// only sees Configuración when they go looking for something specific, so
// an opportunity like "become an academia" was going unnoticed there. This
// is the first thing rendered after the page header instead.
//
// Just a teaser card — the actual multi-step form lives on its own top-level
// route (/convertir-academia, sibling of /onboarding — NOT nested under
// /dashboard, which would pull in the dashboard sidebar layout) instead of
// expanding inline here: this card sits inside a wide dashboard-home column,
// so a wizard confined to it stretched every button to that same width and
// looked broken (see docs/TASKS.md sección 8 y el fix de este bug).
export default function AcademiaConversionCard({ initialStatus }: { initialStatus: ConversionStatus }) {
  if (initialStatus === 'pending') {
    return (
      <div className="flex items-center gap-3 bg-yellow-bg border border-yellow-dark/30 rounded-xl px-5 py-4 mb-6">
        <Building2 className="w-4 h-4 text-neutral-700 shrink-0" />
        <p className="text-[14px] font-semibold text-neutral-800">
          Tu solicitud para convertirte en academia está en revisión. Sigues funcionando como profesor, sin ninguna restricción.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-pink-50 border border-pink-100 rounded-xl px-5 py-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-pink-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] text-neutral-900">¿Diriges una academia?</p>
          <p className="text-[13px] text-neutral-600 mt-0.5">
            Convierte tu cuenta y gestiona todo desde un solo lugar. No pierdes tus clases ni tu perfil actual.
            {initialStatus === 'rejected' && ' Puedes volver a intentarlo.'}
          </p>
          <Link href="/convertir-academia" className="btn-outline btn-sm mt-3 inline-flex">
            Solicitar cambio
          </Link>
        </div>
      </div>
    </div>
  );
}
