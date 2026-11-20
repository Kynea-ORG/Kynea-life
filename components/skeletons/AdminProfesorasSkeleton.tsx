export default function AdminProfesorasSkeleton() {
  return (
    <div
      className="p-6 lg:p-8 max-w-4xl animate-pulse"
      aria-busy="true"
      aria-label="Cargando listado de profesoras..."
    >
      {/* Header */}
      <div className="mb-6">
        <div className="h-8 w-40 bg-neutral-200 rounded-md mb-2" />
        <div className="h-4 w-full max-w-xl bg-neutral-100 rounded mb-1.5" />
        <div className="h-4 w-64 bg-neutral-100 rounded" />
      </div>

      {/* Search bar */}
      <div className="mb-4 flex items-center gap-2 border border-neutral-200 rounded-xl px-3 py-2 bg-white">
        <div className="w-4 h-4 rounded bg-neutral-200 shrink-0" />
        <div className="h-5 flex-1 bg-neutral-100 rounded" />
        <div className="h-7 w-16 bg-neutral-200 rounded-lg shrink-0" />
      </div>

      {/* Professors toggle list */}
      <div className="divide-y divide-neutral-100 bg-white card-dash overflow-hidden">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-neutral-200 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-4 w-44 max-w-full bg-neutral-200 rounded" />
              <div className="h-3 w-16 bg-neutral-100 rounded" />
            </div>
            <div className="h-6 w-11 rounded-full bg-neutral-200 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
