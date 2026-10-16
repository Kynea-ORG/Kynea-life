export default function CategoriasSkeleton() {
  return (
    <div className="min-h-screen bg-white animate-pulse" aria-busy="true" aria-label="Cargando categorías...">
      {/* Header mock */}
      <div className="h-16 border-b border-neutral-100 bg-white" />

      <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-20">
        {/* Title & subtitle */}
        <div className="h-9 w-48 bg-neutral-200 rounded-md mb-2" />
        <div className="h-4 w-72 bg-neutral-100 rounded mb-10" />

        {/* Destacadas section */}
        <div className="mb-12">
          <div className="h-4 w-28 bg-neutral-200 rounded mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-[152px] rounded-2xl bg-neutral-100 border border-neutral-200 p-4 flex flex-col justify-end"
              >
                <div className="h-5 w-3/4 bg-neutral-200 rounded mb-1.5" />
                <div className="h-3 w-1/3 bg-neutral-200 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Todos los estilos section */}
        <div>
          <div className="h-4 w-36 bg-neutral-200 rounded mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-xl border border-neutral-200 bg-neutral-50 px-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-neutral-200" />
                  <div className="h-4 w-24 bg-neutral-200 rounded" />
                </div>
                <div className="h-3 w-10 bg-neutral-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
