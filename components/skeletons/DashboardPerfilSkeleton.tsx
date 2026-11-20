export default function DashboardPerfilSkeleton() {
  return (
    <div
      className="p-6 lg:p-8 max-w-3xl animate-pulse"
      aria-busy="true"
      aria-label="Cargando perfil..."
    >
      {/* Header */}
      <div className="mb-6">
        <div className="h-8 w-36 bg-neutral-200 rounded-md mb-2" />
        <div className="h-4 w-72 max-w-full bg-neutral-100 rounded" />
      </div>

      <div className="space-y-6">
        {/* Photo / Logo card */}
        <div className="bg-white card-dash p-6">
          <div className="h-5 w-36 bg-neutral-200 rounded mb-4" />
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-32 h-32 rounded-xl bg-neutral-200 shrink-0" />
            <div className="pt-1 space-y-2.5">
              <div className="h-9 w-32 bg-neutral-200 rounded-btn" />
              <div className="h-3.5 w-60 max-w-full bg-neutral-100 rounded" />
            </div>
          </div>
        </div>

        {/* Basic info card */}
        <div className="bg-white card-dash p-6 space-y-4">
          <div className="h-5 w-44 bg-neutral-200 rounded" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3.5 w-28 bg-neutral-200 rounded" />
              <div className={`${i === 1 ? 'h-24' : 'h-12'} w-full bg-neutral-100 rounded-btn border border-neutral-200`} />
            </div>
          ))}
        </div>

        {/* Contact / Styles card */}
        <div className="bg-white card-dash p-6 space-y-4">
          <div className="h-5 w-40 bg-neutral-200 rounded" />
          <div className="flex flex-wrap gap-2">
            {[64, 72, 84, 60, 76, 68, 88].map((w, i) => (
              <div key={i} className="h-8 bg-neutral-100 rounded-full" style={{ width: `${w}px` }} />
            ))}
          </div>
          <div className="space-y-3 pt-2">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3.5 w-24 bg-neutral-200 rounded" />
                <div className="h-12 w-full bg-neutral-100 rounded-btn border border-neutral-200" />
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="h-12 w-40 bg-neutral-200 rounded-btn" />
          <div className="h-11 w-36 bg-neutral-100 rounded-btn border border-neutral-200" />
        </div>
      </div>
    </div>
  );
}
