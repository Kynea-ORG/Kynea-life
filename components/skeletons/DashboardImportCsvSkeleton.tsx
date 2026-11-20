export default function DashboardImportCsvSkeleton() {
  return (
    <div
      className="p-6 lg:p-8 max-w-4xl animate-pulse"
      aria-busy="true"
      aria-label="Cargando importador CSV..."
    >
      {/* Header with back link */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-neutral-200 shrink-0" />
        <div>
          <div className="h-8 w-56 bg-neutral-200 rounded-md mb-1.5" />
          <div className="h-4 w-80 max-w-full bg-neutral-100 rounded" />
        </div>
      </div>

      <div className="space-y-6">
        {/* Download template banner */}
        <div className="card-muted p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-neutral-200 shrink-0" />
          <div className="flex-1 space-y-2 w-full">
            <div className="h-5 w-48 bg-neutral-200 rounded" />
            <div className="h-4 w-72 max-w-full bg-neutral-200/70 rounded" />
          </div>
          <div className="h-10 w-40 bg-neutral-200 rounded-btn shrink-0" />
        </div>

        {/* Dropzone */}
        <div className="border-2 border-dashed border-neutral-200 rounded-xl bg-white p-12 flex flex-col items-center">
          <div className="w-16 h-16 rounded-xl bg-neutral-100 mb-4" />
          <div className="h-5 w-52 bg-neutral-200 rounded mb-2" />
          <div className="h-4 w-36 bg-neutral-100 rounded mb-4" />
          <div className="h-10 w-40 bg-neutral-100 rounded-btn border border-neutral-200" />
        </div>

        {/* Requirements card */}
        <div className="bg-white card-dash p-5">
          <div className="h-5 w-44 bg-neutral-200 rounded mb-4" />
          <div className="grid sm:grid-cols-3 gap-4 mb-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-neutral-50 rounded-xl p-3 flex flex-col items-center gap-1.5">
                <div className="h-3 w-16 bg-neutral-200 rounded" />
                <div className="h-4 w-24 bg-neutral-200/80 rounded" />
              </div>
            ))}
          </div>
          <div className="h-4 w-36 bg-neutral-200 rounded mb-2.5" />
          <div className="flex flex-wrap gap-1.5">
            {[72, 56, 48, 44, 96, 108, 76, 68, 40, 72, 64, 80].map((w, i) => (
              <div key={i} className="h-6 bg-neutral-100 rounded-full" style={{ width: `${w}px` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
