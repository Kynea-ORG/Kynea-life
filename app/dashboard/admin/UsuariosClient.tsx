import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import type { AdminCreatedUser } from '@/lib/admin/queries';

const ROLE_LABELS: Record<string, string> = { profesor: 'Profesor', academia: 'Academia', alumno: 'Alumno' };

function roleLabel(role: string | null): string {
  return (role && ROLE_LABELS[role]) || 'Sin rol';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

type UsuariosClientProps = {
  users: AdminCreatedUser[];
  total: number;
  page: number;
  totalPages: number;
};

export default function UsuariosClient({ users, total, page, totalPages }: UsuariosClientProps) {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-neutral-900">Usuarios</h1>
          <p className="text-neutral-500 text-sm mt-1">{total} cuentas creadas</p>
        </div>
        <Link href="/dashboard/admin/crear-usuario" className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-btn transition-colors">
          <PlusCircle className="w-4 h-4" /> Crear usuario
        </Link>
      </div>

      {total === 0 && (
        <div className="text-center py-20">
          <h3 className="text-lg font-bold text-neutral-900 mb-2">Aún no creaste usuarios</h3>
          <p className="text-neutral-500 text-sm mb-6">Las cuentas que crees desde el módulo admin van a aparecer acá.</p>
          <Link href="/dashboard/admin/crear-usuario" className="btn-outline text-sm">Crear usuario</Link>
        </div>
      )}

      {total > 0 && (
        <>
          {/* Desktop table (CSS Grid — rows are inert, no hover highlight, no actions) */}
          <div role="table" aria-label="Usuarios creados" className="hidden md:block bg-white rounded-xl shadow-sm border border-neutral-900 overflow-hidden">
            <div
              role="row"
              className="grid gap-4 px-6 py-4 border-b border-neutral-100 text-xs font-semibold text-neutral-500 uppercase tracking-wide"
              style={{ gridTemplateColumns: '1.6fr 2fr 1fr 1.2fr 1.4fr' }}
            >
              <span role="columnheader">Nombre</span>
              <span role="columnheader">Email</span>
              <span role="columnheader">Rol</span>
              <span role="columnheader">Creado</span>
              <span role="columnheader">Creado por</span>
            </div>
            <div role="rowgroup" className="divide-y divide-neutral-50">
              {users.map(user => (
                <div
                  key={user.id}
                  role="row"
                  className="grid gap-4 items-center px-6 py-4"
                  style={{ gridTemplateColumns: '1.6fr 2fr 1fr 1.2fr 1.4fr' }}
                >
                  <div role="cell" className="min-w-0">
                    <p className="font-semibold text-neutral-900 text-sm truncate">{user.name || 'Sin nombre'}</p>
                  </div>
                  <div role="cell" className="min-w-0">
                    <p className="text-xs text-neutral-600 truncate">{user.email || '—'}</p>
                  </div>
                  <div role="cell">
                    <span className="text-xs text-neutral-600 bg-neutral-100 px-2 py-1 rounded-full">{roleLabel(user.role)}</span>
                  </div>
                  <div role="cell" className="text-xs text-neutral-600">
                    {formatDate(user.createdAt)}
                  </div>
                  <div role="cell" className="text-xs text-neutral-600 min-w-0">
                    <span className="truncate block">{user.creatorName || 'Admin eliminado'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {users.map(user => (
              <div key={user.id} className="bg-white rounded-xl border border-neutral-900 p-4 shadow-sm">
                <p className="font-bold text-neutral-900 text-sm">{user.name || 'Sin nombre'}</p>
                <p className="text-xs text-neutral-500">{user.email || '—'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-neutral-600 bg-neutral-100 px-2 py-1 rounded-full">{roleLabel(user.role)}</span>
                  <span className="text-xs text-neutral-600">{formatDate(user.createdAt)}</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">Creado por {user.creatorName || 'Admin eliminado'}</p>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              {page > 1 ? (
                <Link href={`/dashboard/admin?page=${page - 1}`} className="text-xs px-3 py-1.5 rounded-btn border border-neutral-900 text-neutral-700 font-semibold hover:bg-neutral-50 transition-colors">
                  Anterior
                </Link>
              ) : (
                <span className="text-xs px-3 py-1.5 rounded-btn border border-neutral-900 text-neutral-700 font-semibold opacity-50 cursor-not-allowed">
                  Anterior
                </span>
              )}
              <span className="text-sm text-neutral-500">Página {page} de {totalPages}</span>
              {page < totalPages ? (
                <Link href={`/dashboard/admin?page=${page + 1}`} className="text-xs px-3 py-1.5 rounded-btn border border-neutral-900 text-neutral-700 font-semibold hover:bg-neutral-50 transition-colors">
                  Siguiente
                </Link>
              ) : (
                <span className="text-xs px-3 py-1.5 rounded-btn border border-neutral-900 text-neutral-700 font-semibold opacity-50 cursor-not-allowed">
                  Siguiente
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
