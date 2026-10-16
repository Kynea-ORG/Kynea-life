export default function DashboardTableSkeleton() {
  return (
    <div className="p-6 lg:p-8 animate-pulse" aria-busy="true" aria-label="Cargando tabla de clases...">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="h-8 w-44 bg-neutral-200/80 rounded-lg mb-2" />
          <div className="h-4 w-64 bg-neutral-100 rounded" />
        </div>
        <div className="h-11 w-36 bg-neutral-200/80 rounded-btn self-start sm:self-auto" />
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 flex gap-2 sm:gap-3 mb-6 overflow-x-auto pb-px">
        {[20, 24, 24, 24, 24].map((w, i) => (
          <div key={i} className="h-9 rounded-t-lg bg-neutral-100 shrink-0" style={{ width: `${w * 4}px` }} />
        ))}
      </div>

      {/* Desktop table skeleton */}
      <div className="hidden md:block bg-white card-dash overflow-hidden border border-neutral-200/80 rounded-xl">
        <div
          className="grid gap-4 px-6 py-4 border-b border-neutral-100 text-xs uppercase"
          style={{ gridTemplateColumns: '2.2fr 0.9fr 1fr 1.3fr 0.8fr 0.9fr 1.6fr' }}
        >
          {['Clase', 'Tipo', 'Estado', 'Horario', 'Cupos', 'Precio', 'Acciones'].map((header, i) => (
            <div key={i} className="h-3.5 bg-neutral-100 rounded w-16" />
          ))}
        </div>
        <div className="divide-y divide-neutral-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="grid gap-4 items-center px-6 py-4"
              style={{ gridTemplateColumns: '2.2fr 0.9fr 1fr 1.3fr 0.8fr 0.9fr 1.6fr' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-10 rounded-lg bg-neutral-200/80 shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="h-4 w-4/5 bg-neutral-200/80 rounded" />
                  <div className="h-3 w-1/2 bg-neutral-100 rounded" />
                </div>
              </div>
              <div>
                <div className="h-5 w-16 bg-neutral-100 rounded-full" />
              </div>
              <div>
                <div className="h-5 w-20 bg-neutral-200/70 rounded-full" />
              </div>
              <div>
                <div className="h-3.5 w-24 bg-neutral-100 rounded" />
              </div>
              <div>
                <div className="h-3.5 w-10 bg-neutral-100 rounded" />
              </div>
              <div>
                <div className="h-4 w-14 bg-neutral-200/80 rounded" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-16 bg-neutral-200/80 rounded-btn" />
                <div className="h-7 w-7 bg-neutral-100 rounded-lg" />
                <div className="h-7 w-7 bg-neutral-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile cards skeleton */}
      <div className="md:hidden space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white card-dash p-4 border border-neutral-200/80 rounded-xl space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 rounded-xl bg-neutral-200/80 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-4/5 bg-neutral-200/80 rounded" />
                <div className="h-3 w-1/2 bg-neutral-100 rounded" />
                <div className="flex gap-2 pt-1">
                  <div className="h-5 w-16 bg-neutral-100 rounded-full" />
                  <div className="h-5 w-14 bg-neutral-200/70 rounded" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
