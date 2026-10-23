export default function DashboardOverviewSkeleton() {
  return (
    <div className="p-6 lg:p-8 w-full animate-pulse" aria-busy="true" aria-label="Cargando panel...">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="h-8 w-56 bg-neutral-200 rounded-md mb-2" />
          <div className="h-4 w-64 bg-neutral-100 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-neutral-200 rounded-lg" />
          <div className="h-10 w-28 bg-neutral-100 rounded-lg" />
        </div>
      </div>

      {/* Metrics strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50 flex items-center justify-between">
            <div>
              <div className="h-3.5 w-28 bg-neutral-200 rounded mb-2" />
              <div className="h-7 w-16 bg-neutral-200 rounded" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-neutral-200" />
          </div>
        ))}
      </div>

      {/* Recent classes section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-36 bg-neutral-200 rounded" />
          <div className="h-4 w-20 bg-neutral-100 rounded" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl border border-neutral-200 bg-neutral-50 p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-neutral-200 shrink-0" />
                <div>
                  <div className="h-4 w-44 bg-neutral-200 rounded mb-2" />
                  <div className="h-3 w-28 bg-neutral-100 rounded" />
                </div>
              </div>
              <div className="h-6 w-20 bg-neutral-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
