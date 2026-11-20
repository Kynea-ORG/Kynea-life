export default function AdminCrearUsuarioSkeleton() {
  return (
    <div
      className="p-6 lg:p-8 max-w-2xl animate-pulse"
      aria-busy="true"
      aria-label="Cargando formulario de creación de usuario..."
    >
      {/* Header */}
      <div className="mb-6">
        <div className="h-8 w-44 bg-neutral-200 rounded-md mb-2" />
        <div className="h-4 w-80 max-w-full bg-neutral-100 rounded" />
      </div>

      {/* Form card */}
      <div className="bg-white card-dash p-6 flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3.5 w-32 bg-neutral-200 rounded" />
            <div className="h-12 w-full bg-neutral-100 rounded-btn border border-neutral-200" />
          </div>
        ))}

        {/* Account type cards */}
        <div className="space-y-1.5">
          <div className="h-3.5 w-28 bg-neutral-200 rounded" />
          <div className="flex flex-col gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-neutral-200">
                <div className="w-10 h-10 rounded-lg bg-neutral-200 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-24 bg-neutral-200 rounded" />
                  <div className="h-3.5 w-52 max-w-full bg-neutral-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit button */}
        <div className="h-12 w-full bg-neutral-200 rounded-btn mt-1" />
      </div>
    </div>
  );
}
