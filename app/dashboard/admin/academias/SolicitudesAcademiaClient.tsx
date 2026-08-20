'use client';
import { useState } from 'react';
import { Loader2, Check, X } from 'lucide-react';
import type { AcademiaRequestRow } from '@/lib/admin/queries';
import { approveAcademiaRequest } from '@/lib/admin/actions';

const KIND_LABELS: Record<AcademiaRequestRow['kind'], string> = {
  signup: 'Alta nueva',
  conversion: 'Conversión de profesor',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function SolicitudesAcademiaClient({ requests: initialRequests }: { requests: AcademiaRequestRow[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleDecision(id: string, approve: boolean) {
    setProcessingId(id);
    setError('');
    try {
      await approveAcademiaRequest(id, approve);
      setRequests(r => r.filter(req => req.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la solicitud.');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-neutral-900">Solicitudes de academia</h1>
        <p className="text-neutral-500 text-sm mt-1">{requests.length} pendiente{requests.length !== 1 ? 's' : ''} de revisión</p>
      </div>

      {error && (
        <div className="bg-red-bg border-l-4 border-red text-[13px] font-medium px-4 py-3 rounded-lg text-red-700 animate-fade-in mb-4">
          {error}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="text-center py-20">
          <h3 className="text-lg font-bold text-neutral-900 mb-2">No hay solicitudes pendientes</h3>
          <p className="text-neutral-500 text-sm">Las altas nuevas de academia y las conversiones de profesor van a aparecer acá.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div role="table" aria-label="Solicitudes de academia" className="hidden md:block bg-white rounded-xl shadow-sm border border-neutral-900 overflow-hidden">
            <div
              role="row"
              className="grid gap-4 px-6 py-4 border-b border-neutral-100 text-xs font-semibold text-neutral-500 uppercase tracking-wide"
              style={{ gridTemplateColumns: '1.6fr 1.3fr 1fr 1.2fr 1.6fr' }}
            >
              <span role="columnheader">Nombre</span>
              <span role="columnheader">Tipo</span>
              <span role="columnheader">RUC</span>
              <span role="columnheader">Solicitado</span>
              <span role="columnheader">Acciones</span>
            </div>
            <div role="rowgroup" className="divide-y divide-neutral-50">
              {requests.map(req => {
                const processing = processingId === req.id;
                return (
                  <div key={req.id} role="row" className="grid gap-4 items-center px-6 py-4" style={{ gridTemplateColumns: '1.6fr 1.3fr 1fr 1.2fr 1.6fr' }}>
                    <div role="cell" className="min-w-0">
                      <p className="font-semibold text-neutral-900 text-sm truncate">{req.profileName || 'Sin nombre'}</p>
                      <p className="text-[11px] text-neutral-400">actualmente {req.profileRole}</p>
                    </div>
                    <div role="cell">
                      <span className="text-xs text-neutral-600 bg-neutral-100 px-2 py-1 rounded-full">{KIND_LABELS[req.kind]}</span>
                    </div>
                    <div role="cell" className="text-xs text-neutral-600">{req.ruc || '—'}</div>
                    <div role="cell" className="text-xs text-neutral-600">{formatDate(req.createdAt)}</div>
                    <div role="cell" className="flex items-center gap-2">
                      <button
                        onClick={() => handleDecision(req.id, true)}
                        disabled={processing}
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-btn transition-colors disabled:opacity-50"
                      >
                        {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleDecision(req.id, false)}
                        disabled={processing}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 border border-neutral-900 text-neutral-700 hover:bg-neutral-50 rounded-btn transition-colors disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Rechazar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {requests.map(req => {
              const processing = processingId === req.id;
              return (
                <div key={req.id} className="bg-white rounded-xl border border-neutral-900 p-4 shadow-sm">
                  <p className="font-bold text-neutral-900 text-sm">{req.profileName || 'Sin nombre'}</p>
                  <p className="text-[11px] text-neutral-400">actualmente {req.profileRole}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-neutral-600 bg-neutral-100 px-2 py-1 rounded-full">{KIND_LABELS[req.kind]}</span>
                    <span className="text-xs text-neutral-600">{formatDate(req.createdAt)}</span>
                  </div>
                  {req.ruc && <p className="text-xs text-neutral-500 mt-1">RUC: {req.ruc}</p>}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => handleDecision(req.id, true)}
                      disabled={processing}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-btn transition-colors disabled:opacity-50"
                    >
                      {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Aprobar
                    </button>
                    <button
                      onClick={() => handleDecision(req.id, false)}
                      disabled={processing}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2.5 border border-neutral-900 text-neutral-700 rounded-btn transition-colors disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      Rechazar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
