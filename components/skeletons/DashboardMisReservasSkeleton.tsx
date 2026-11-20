export default function DashboardMisReservasSkeleton() {
  return (
    <div
      className="p-6 lg:p-8 w-full max-w-5xl animate-pulse"
      aria-busy="true"
      aria-label="Cargando mis reservas..."
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <div className="h-8 w-44 bg-neutral-200 rounded-md mb-2" />
          <div className="h-4 w-80 max-w-full bg-neutral-100 rounded" />
        </div>
        <div className="h-9 w-40 bg-neutral-100 rounded-btn shrink-0 hidden sm:block" />
      </div>

      {/* View toggle (Lista / Calendario) */}
      <div className="inline-flex rounded-xl bg-neutral-100 p-1 mb-6 gap-1">
        <div className="h-9 w-20 bg-white rounded-lg shadow-sm" />
        <div className="h-9 w-28 bg-neutral-200/60 rounded-lg" />
      </div>

      {/* Próximas section */}
      <div className="space-y-4">
        <div className="h-5 w-24 bg-neutral-200 rounded" />
        {[0, 1, 2].map((i) => (
          <article key={i} className="bg-white card-dash overflow-hidden">
            <div className="flex gap-3.5 p-3.5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-neutral-200 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="h-5 w-48 max-w-full bg-neutral-200 rounded" />
                  <div className="h-6 w-20 bg-neutral-200/80 rounded-full shrink-0" />
                </div>
                <div className="h-3.5 w-32 bg-neutral-100 rounded" />
                <div className="h-4 w-52 max-w-full bg-neutral-200/70 rounded" />
                <div className="h-3.5 w-44 max-w-full bg-neutral-100 rounded" />
                <div className="h-3.5 w-36 bg-neutral-100 rounded" />
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-neutral-100">
              <div className="h-3.5 w-40 bg-neutral-100 rounded" />
              <div className="w-4 h-4 bg-neutral-100 rounded" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
