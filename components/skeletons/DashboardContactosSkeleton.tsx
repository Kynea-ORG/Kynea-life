export default function DashboardContactosSkeleton() {
  return (
    <div
      className="p-6 lg:p-8 max-w-4xl animate-pulse"
      aria-busy="true"
      aria-label="Cargando contactos e interacciones..."
    >
      {/* Header */}
      <div className="mb-6">
        <div className="h-8 w-64 max-w-full bg-neutral-200 rounded-md mb-2" />
        <div className="h-4 w-56 bg-neutral-100 rounded" />
      </div>

      {/* 3 Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white card-dash p-5">
            <div className="w-5 h-5 bg-neutral-200 rounded mb-3" />
            <div className="h-8 w-14 bg-neutral-200 rounded mb-1.5" />
            <div className="h-3.5 w-24 max-w-full bg-neutral-100 rounded" />
          </div>
        ))}
      </div>

      {/* Metrics table */}
      <div className="bg-white card-dash overflow-hidden">
        <div className="divide-y divide-neutral-100">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 bg-neutral-50">
            <div className="h-3.5 w-16 bg-neutral-200 rounded" />
            <div className="h-3.5 w-20 bg-neutral-200 rounded" />
            <div className="h-3.5 w-16 bg-neutral-200 rounded" />
            <div className="h-3.5 w-20 bg-neutral-200 rounded" />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-4 items-center">
              <div className="space-y-1.5 min-w-0">
                <div className="h-4 w-48 max-w-full bg-neutral-200 rounded" />
                <div className="h-3 w-28 bg-neutral-100 rounded" />
              </div>
              <div className="w-20 flex justify-center">
                <div className="h-5 w-8 bg-neutral-200 rounded" />
              </div>
              <div className="w-16 flex justify-center">
                <div className="h-5 w-8 bg-neutral-100 rounded" />
              </div>
              <div className="w-20 flex justify-center">
                <div className="h-5 w-8 bg-neutral-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-3 w-80 max-w-full bg-neutral-100 rounded mt-4" />
    </div>
  );
}
