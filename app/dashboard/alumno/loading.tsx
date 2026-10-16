export default function AlumnoDashboardLoading() {
  return (
    <div className="p-6 lg:p-8 w-full animate-pulse" aria-busy="true" aria-label="Cargando panel de alumno...">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <div className="h-8 w-44 bg-neutral-200 rounded-md mb-2" />
          <div className="h-4 w-60 bg-neutral-100 rounded" />
        </div>
        <div className="h-9 w-32 bg-neutral-100 rounded-lg hidden sm:block" />
      </div>

      {/* Upsell banner placeholder */}
      <div className="h-32 rounded-2xl bg-neutral-100 border border-neutral-200 mb-8" />

      {/* Saved classes section */}
      <div>
        <div className="h-5 w-36 bg-neutral-200 rounded mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-neutral-200 bg-neutral-50 p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-neutral-200 shrink-0" />
                <div className="space-y-2">
                  <div className="h-4 w-44 bg-neutral-200 rounded" />
                  <div className="h-3 w-32 bg-neutral-100 rounded" />
                  <div className="h-3 w-24 bg-neutral-100 rounded" />
                </div>
              </div>
              <div className="h-6 w-16 bg-neutral-200 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
