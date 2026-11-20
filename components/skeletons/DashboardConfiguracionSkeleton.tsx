export default function DashboardConfiguracionSkeleton() {
  return (
    <div
      className="p-6 lg:p-8 max-w-3xl animate-pulse"
      aria-busy="true"
      aria-label="Cargando configuración..."
    >
      {/* Header */}
      <div className="mb-6">
        <div className="h-8 w-44 bg-neutral-200 rounded-md mb-2" />
        <div className="h-4 w-64 max-w-full bg-neutral-100 rounded" />
      </div>

      <div className="space-y-6">
        {/* Visibility toggles card */}
        <div className="bg-white card-dash p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-neutral-100 rounded-xl shrink-0" />
            <div className="space-y-1.5">
              <div className="h-5 w-28 bg-neutral-200 rounded" />
              <div className="h-3.5 w-52 bg-neutral-100 rounded" />
            </div>
          </div>
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="h-4 w-56 max-w-full bg-neutral-200/80 rounded" />
                <div className="w-10 h-5 bg-neutral-200 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Security & password card */}
        <div className="bg-white card-dash p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-neutral-100 rounded-xl shrink-0" />
            <div className="space-y-1.5">
              <div className="h-5 w-44 bg-neutral-200 rounded" />
              <div className="h-3.5 w-60 bg-neutral-100 rounded" />
            </div>
          </div>
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3.5 w-36 bg-neutral-200 rounded" />
                <div className="h-12 w-full bg-neutral-100 rounded-btn border border-neutral-200" />
              </div>
            ))}
            <div className="h-12 w-44 bg-neutral-200 rounded-btn" />
          </div>
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-neutral-100">
            <div className="h-4 w-48 bg-neutral-100 rounded" />
            <div className="w-10 h-5 bg-neutral-100 rounded-full shrink-0" />
          </div>
        </div>

        {/* Danger zone card */}
        <div className="bg-white card-dash p-6 space-y-3">
          <div className="h-5 w-36 bg-neutral-200 rounded" />
          <div className="h-4 w-64 max-w-full bg-neutral-100 rounded" />
          <div className="h-9 w-36 bg-neutral-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
