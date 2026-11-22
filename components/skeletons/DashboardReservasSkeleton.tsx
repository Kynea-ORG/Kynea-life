export default function DashboardReservasSkeleton() {
  return (
    <div
      className="p-6 lg:p-8 w-full max-w-6xl animate-pulse"
      aria-busy="true"
      aria-label="Cargando reservas recibidas..."
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="h-8 w-52 bg-neutral-200 rounded-md mb-2" />
          <div className="h-4 w-96 max-w-full bg-neutral-100 rounded" />
        </div>
        <div className="h-9 w-52 bg-neutral-200/80 rounded-btn shrink-0" />
      </div>

      {/* Tabs estilo pill (Próximas / Por cerrar / Historial) */}
      <div className="inline-flex gap-1 mb-6 bg-neutral-100 rounded-xl p-1 max-w-full">
        <div className="h-9 w-28 bg-white rounded-lg shadow-sm" />
        <div className="h-9 w-28 bg-neutral-200/60 rounded-lg" />
        <div className="h-9 w-24 bg-neutral-200/60 rounded-lg" />
      </div>

      {/* Grid Maestro-Detalle de 2 tarjetas con igual altura en desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 lg:gap-6 items-stretch">
        {/* Panel izquierdo: filtro + lista maestra de sesiones */}
        <div className="flex flex-col bg-white card-dash overflow-hidden min-w-0 lg:h-[calc(100dvh-230px)] lg:min-h-[540px] lg:max-h-[760px]">
          <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/70 flex items-center gap-2 shrink-0">
            <div className="h-8 w-16 bg-neutral-300/80 rounded-lg" />
            <div className="h-8 w-36 bg-neutral-200/80 rounded-lg" />
          </div>

          <div className="p-2.5 space-y-1.5 flex-1 min-h-0 overflow-hidden">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`px-4 py-3.5 rounded-lg ${i === 0 ? 'bg-neutral-100/80' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="h-4 w-32 bg-neutral-200 rounded" />
                  <div className="flex items-center gap-1.5 shrink-0">
                    {i < 2 && <div className="h-5 w-8 bg-neutral-200 rounded-full" />}
                    <div className="h-5 w-11 bg-neutral-100 border border-neutral-200 rounded-full" />
                  </div>
                </div>
                <div className="mt-2 h-3.5 w-48 max-w-full bg-neutral-100 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Panel derecho: cabecera blanca + secciones y filas de alumnos de 2 líneas (sin avatares) */}
        <div className="hidden lg:flex flex-col bg-white card-dash overflow-hidden min-w-0 lg:h-[calc(100dvh-230px)] lg:min-h-[540px] lg:max-h-[760px]">
          {/* Cabecera de la sesión seleccionada */}
          <div className="px-6 py-5 bg-white border-b border-neutral-100 shrink-0">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-5 w-60 max-w-full bg-neutral-200 rounded" />
                  <div className="h-5 w-20 bg-neutral-100 rounded-full shrink-0" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3.5 w-48 bg-neutral-100 rounded" />
                  <div className="h-3.5 w-24 bg-neutral-100 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 pt-1">
                <div className="w-24 h-1.5 rounded-full bg-neutral-200 shrink-0" />
                <div className="h-3.5 w-16 bg-neutral-200 rounded shrink-0" />
              </div>
            </div>
          </div>

          {/* Cuerpo: sub-cabeceras y filas de alumnos */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {/* Sección 1: Por confirmar */}
            <div className="border-l-[3px] border-l-neutral-200">
              <div className="px-6 py-3 bg-neutral-50/90 border-b border-neutral-100">
                <div className="h-3.5 w-32 bg-neutral-200 rounded" />
              </div>
              <div className="divide-y divide-neutral-100">
                {[0, 1].map((row) => (
                  <div key={row} className="px-6 py-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-40 bg-neutral-200 rounded" />
                      <div className="h-3.5 w-56 max-w-full bg-neutral-100 rounded" />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="h-8 w-24 bg-neutral-200 rounded-btn" />
                      <div className="h-8 w-20 bg-neutral-100 border border-neutral-200 rounded-btn" />
                      <div className="w-4 h-4 bg-neutral-100 rounded shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sección 2: Confirmados */}
            <div className="border-t border-neutral-200">
              <div className="px-6 py-3 bg-neutral-50/80 border-b border-neutral-100">
                <div className="h-3.5 w-28 bg-neutral-200 rounded" />
              </div>
              <div className="divide-y divide-neutral-100">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="px-6 py-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-36 bg-neutral-200 rounded" />
                      <div className="h-3.5 w-52 max-w-full bg-neutral-100 rounded" />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="h-8 w-32 bg-neutral-100 border border-neutral-200 rounded-btn" />
                      <div className="w-4 h-4 bg-neutral-100 rounded shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
