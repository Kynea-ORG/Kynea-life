'use client';
import { useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { requestAcademiaConversion } from '@/lib/profiles/actions';

type ConversionStatus = 'pending' | 'approved' | 'rejected' | null;

// Lives on the dashboard home (not Configuración) on purpose — a profesor
// only sees Configuración when they go looking for something specific, so
// an opportunity like "become an academia" was going unnoticed there. This
// is the first thing rendered after the page header instead.
export default function AcademiaConversionCard({ initialStatus }: { initialStatus: ConversionStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [ruc, setRuc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (status === 'pending') {
    return (
      <div className="flex items-center gap-3 bg-yellow-bg border border-yellow-dark/30 rounded-xl px-5 py-4 mb-6">
        <Building2 className="w-4 h-4 text-neutral-700 shrink-0" />
        <p className="text-[14px] font-semibold text-neutral-800">
          Tu solicitud para convertirte en academia está en revisión. Sigues funcionando como profesor, sin ninguna restricción.
        </p>
      </div>
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      await requestAcademiaConversion(ruc.trim() || undefined);
      setStatus('pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud.');
    } finally {
      setSubmitting(false);
    }
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
            {status === 'rejected' && ' Puedes volver a intentarlo.'}
          </p>
          {error && <p className="text-[13px] text-red-600 font-medium mt-2">{error}</p>}
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <input
              type="text"
              value={ruc}
              onChange={e => setRuc(e.target.value)}
              placeholder="RUC (opcional)"
              className="flex-1 sm:max-w-[220px] border-2 border-neutral-200 rounded-btn px-3 py-2 text-[13px] text-neutral-800 outline-none focus:border-primary bg-white"
            />
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-outline btn-sm flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {submitting ? 'Enviando…' : 'Solicitar cambio'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
