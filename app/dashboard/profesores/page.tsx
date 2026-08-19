import { Users } from 'lucide-react';
import { requireRole } from '@/lib/auth/requireRole';

// El roster completo (invitar/gestionar profesores) todavía no existe —
// ver docs/TASKS.md 8.8. No hay link visible a esta ruta (ver
// DashboardSidebar.tsx y dashboard/page.tsx), pero si algún academia llega
// acá por una URL vieja, mejor un placeholder honesto que una UI que
// aparenta funcionar sin guardar nada.
export default async function ProfesoresPage() {
  await requireRole(['academia']);

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-neutral-900">Profesores</h1>
        <p className="text-neutral-500 text-sm mt-1">Gestiona el equipo de tu academia</p>
      </div>
      <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-10 text-center">
        <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Users className="w-6 h-6 text-pink-600" />
        </div>
        <h2 className="font-bold text-neutral-900 mb-2">Próximamente</h2>
        <p className="text-neutral-500 text-sm max-w-sm mx-auto">
          Estamos construyendo la forma de invitar y gestionar profesores dentro de tu academia. Mientras tanto, puedes seguir publicando clases directamente desde tu cuenta.
        </p>
      </div>
    </div>
  );
}
