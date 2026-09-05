import { fetchUserCounts } from '@/lib/admin/queries';

function StatCard({ label, value, big = false }: { label: string; value: number; big?: boolean }) {
  return (
    <div className={`bg-white rounded-xl border p-6 shadow-sm ${big ? 'border-primary' : 'border-neutral-900'}`}>
      <p className={`font-black text-neutral-900 ${big ? 'text-4xl' : 'text-3xl'}`}>{value}</p>
      <p className="text-sm text-neutral-600 mt-1">{label}</p>
    </div>
  );
}

export default async function AdminResumenPage() {
  const counts = await fetchUserCounts();

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-neutral-900">Resumen</h1>
        <p className="text-neutral-600 text-sm mt-1">Usuarios registrados en la plataforma</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Usuarios totales" value={counts.total} big />
        <StatCard label="Alumnos" value={counts.alumno} />
        <StatCard label="Profesores" value={counts.profesor} />
        <StatCard label="Academias" value={counts.academia} />
      </div>

      {counts.academia > 0 && (
        <div className="mt-4 bg-white card-dash p-6">
          <p className="text-sm font-bold text-neutral-900 mb-4">Academias por estado</p>
          <div className="flex items-center gap-8">
            <div>
              <p className="text-xl font-black text-neutral-900">{counts.academiaApproved}</p>
              <p className="text-xs text-neutral-600 mt-0.5">Aprobadas</p>
            </div>
            <div>
              <p className="text-xl font-black text-neutral-900">{counts.academiaPending}</p>
              <p className="text-xs text-neutral-600 mt-0.5">Pendientes de revisión</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
