export default function AdminResumenSkeleton() {
  return (
    <div
      className="p-6 lg:p-8 animate-pulse"
      aria-busy="true"
      aria-label="Cargando resumen de administración..."
    >
      {/* Header */}
      <div className="mb-6">
        <div className="h-8 w-36 bg-neutral-200 rounded-md mb-2" />
        <div className="h-4 w-60 bg-neutral-100 rounded" />
      </div>

      {/* 4 Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white card-dash p-6">
            <div className={`${i === 0 ? 'h-10 w-20' : 'h-9 w-16'} bg-neutral-200 rounded mb-2`} />
            <div className="h-4 w-28 max-w-full bg-neutral-100 rounded" />
          </div>
        ))}
      </div>

      {/* Academias by status card */}
      <div className="mt-4 bg-white card-dash p-6">
        <div className="h-4 w-40 bg-neutral-200 rounded mb-4" />
        <div className="flex flex-wrap items-center gap-8">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <div className="h-7 w-10 bg-neutral-200 rounded mb-1.5" />
              <div className="h-3.5 w-24 bg-neutral-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
