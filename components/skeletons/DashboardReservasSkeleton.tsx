export default function DashboardReservasSkeleton() {
  return (
    <div
      className="p-6 lg:p-8 w-full max-w-5xl animate-pulse"
      aria-busy="true"
      aria-label="Cargando reservas recibidas..."
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <div className="h-8 w-52 bg-neutral-200 rounded-md mb-2" />
          <div className="h-4 w-80 max-w-full bg-neutral-100 rounded" />
        </div>
        <div className="h-9 w-52 bg-neutral-200/80 rounded-btn shrink-0" />
      </div>

      {/* 3 KPI cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white card-dash p-4">
            <div className="h-7 w-16 bg-neutral-200 rounded mb-2" />
            <div className="h-3.5 w-28 max-w-full bg-neutral-100 rounded" />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-200 mb-5 pb-2">
        <div className="h-7 w-24 bg-neutral-200 rounded-md" />
        <div className="h-7 w-24 bg-neutral-100 rounded-md" />
        <div className="h-7 w-20 bg-neutral-100 rounded-md" />
      </div>

      {/* Grouped booking cards */}
      <div className="space-y-5">
        {[0, 1].map((group) => (
          <section key={group} className="bg-white card-dash overflow-hidden">
            <div className="p-4 bg-neutral-50 border-b border-neutral-200">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="h-5 w-56 max-w-full bg-neutral-200 rounded" />
                  <div className="h-3.5 w-44 max-w-full bg-neutral-100 rounded" />
                </div>
                <div className="h-6 w-20 bg-neutral-200 rounded-full shrink-0" />
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-neutral-200" />
                <div className="h-3.5 w-24 bg-neutral-200 rounded shrink-0" />
              </div>
            </div>

            <div className="divide-y divide-neutral-100">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-center gap-3 p-3.5">
                  <div className="w-10 h-10 rounded-full bg-neutral-200 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-36 bg-neutral-200 rounded" />
                      <div className="h-4 w-24 bg-neutral-100 rounded-full hidden sm:block" />
                    </div>
                    <div className="h-3 w-48 max-w-full bg-neutral-100 rounded" />
                  </div>
                  <div className="h-6 w-20 bg-neutral-200/80 rounded-full shrink-0" />
                  <div className="w-4 h-4 bg-neutral-100 rounded shrink-0" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
