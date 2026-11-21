function StatCardSkeleton({
  big = false,
  withSubtitle = false,
}: {
  big?: boolean;
  withSubtitle?: boolean;
}) {
  return (
    <div className="bg-white card-dash p-6">
      <div className={`${big ? 'h-10 w-20' : 'h-9 w-16'} bg-neutral-200 rounded mb-2`} />
      <div className="h-4 w-32 max-w-full bg-neutral-200/80 rounded" />
      {withSubtitle && <div className="h-3 w-40 max-w-full bg-neutral-100 rounded mt-2" />}
    </div>
  );
}

export default function AdminResumenSkeleton() {
  return (
    <div
      className="p-6 lg:p-8 space-y-10 max-w-6xl animate-pulse"
      aria-busy="true"
      aria-label="Cargando resumen de administración..."
    >
      {/* Page header */}
      <div>
        <div className="h-8 w-36 bg-neutral-200 rounded-md mb-2" />
        <div className="h-4 w-80 max-w-full bg-neutral-100 rounded" />
      </div>

      {/* 1. Reservas */}
      <section className="space-y-4">
        <div>
          <div className="h-6 w-28 bg-neutral-200 rounded mb-1.5" />
          <div className="h-3.5 w-80 max-w-full bg-neutral-100 rounded" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton big withSubtitle />
          <StatCardSkeleton withSubtitle />
          <StatCardSkeleton withSubtitle />
          <StatCardSkeleton withSubtitle />
        </div>

        <div className="bg-white card-dash p-6">
          <div className="h-4 w-28 bg-neutral-200 rounded mb-4" />
          <div className="flex flex-wrap items-center gap-8">
            {[0, 1].map((i) => (
              <div key={i}>
                <div className="h-7 w-12 bg-neutral-200 rounded mb-1.5" />
                <div className="h-3.5 w-20 bg-neutral-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Clases en la plataforma */}
      <section className="space-y-4">
        <div>
          <div className="h-6 w-52 bg-neutral-200 rounded mb-1.5" />
          <div className="h-3.5 w-96 max-w-full bg-neutral-100 rounded" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton big />
          <StatCardSkeleton withSubtitle />
          <StatCardSkeleton withSubtitle />
          <StatCardSkeleton withSubtitle />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Por tipo */}
          <div className="bg-white card-dash p-5">
            <div className="h-4 w-20 bg-neutral-200 rounded mb-3" />
            <div className="grid grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="h-7 w-10 bg-neutral-200 rounded mb-1.5" />
                  <div className="h-3.5 w-20 bg-neutral-100 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Modalidad y origen */}
          <div className="bg-white card-dash p-5">
            <div className="h-4 w-36 bg-neutral-200 rounded mb-3" />
            <div className="grid grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="h-7 w-10 bg-neutral-200 rounded mb-1.5" />
                  <div className="h-3.5 w-20 bg-neutral-100 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Engagement acumulado */}
          <div className="bg-white card-dash p-5">
            <div className="h-4 w-44 bg-neutral-200 rounded mb-3" />
            <div className="flex flex-wrap items-center gap-6">
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <div className="h-7 w-12 bg-neutral-200 rounded mb-1.5" />
                  <div className="h-3.5 w-16 bg-neutral-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top 5 clases más vistas */}
        <div className="bg-white card-dash p-5">
          <div className="h-4 w-44 bg-neutral-200 rounded mb-3" />
          <ul className="divide-y divide-neutral-100">
            {[0, 1, 2, 3, 4].map((i) => (
              <li key={i} className="py-2.5 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2.5 flex-1">
                  <div className="h-3.5 w-4 bg-neutral-200 rounded shrink-0" />
                  <div className="h-4 w-56 max-w-full bg-neutral-200 rounded" />
                  <div className="h-5 w-20 bg-neutral-100 rounded-full shrink-0" />
                </div>
                <div className="h-3.5 w-44 max-w-full bg-neutral-100 rounded shrink-0" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3. Usuarios y Academias */}
      <section className="space-y-4">
        <div>
          <div className="h-6 w-48 bg-neutral-200 rounded mb-1.5" />
          <div className="h-3.5 w-56 bg-neutral-100 rounded" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton big />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        <div className="bg-white card-dash p-6">
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
      </section>
    </div>
  );
}
