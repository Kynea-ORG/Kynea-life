import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadBookingActionByToken } from '@/lib/bookings/tokens';
import AccionReservaClient from './AccionReservaClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Confirmar reserva · Kynea',
  robots: { index: false, follow: false },
};

export default async function AccionReservaPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const token = typeof t === 'string' ? t.trim() : '';

  const result = token
    ? await loadBookingActionByToken(createAdminClient(), token)
    : ({ ok: false, reason: 'missing' } as const);

  return (
    <main className="min-h-[70vh] bg-neutral-50 py-10 px-4 flex items-start justify-center">
      <div className="w-full max-w-lg">
        {result.ok ? (
          <AccionReservaClient
            token={token}
            booking={result.booking}
            initialUsed={result.used}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-yellow-bg text-yellow-dark flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-black text-neutral-900">
              {result.reason === 'expired' ? 'Este enlace ya venció' : 'Enlace no válido'}
            </h1>
            <p className="text-sm text-neutral-600">
              {result.reason === 'expired'
                ? 'El enlace de acción rápida caducó. Puedes revisar y gestionar esta reserva directamente desde tu panel.'
                : 'No encontramos una solicitud asociada a este enlace. Verifica que lo hayas abierto completo desde tu correo.'}
            </p>
            <div className="pt-2">
              <Link href="/dashboard/reservas" className="btn-primary btn-sm inline-flex">
                Ir a Reservas recibidas
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
