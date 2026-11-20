export default function DashboardWizardSkeleton() {
  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-neutral-50 md:sticky md:inset-auto md:top-0 md:z-auto md:h-dvh animate-pulse"
      aria-busy="true"
      aria-label="Cargando formulario de clase..."
    >
      {/* Wizard header */}
      <header className="shrink-0 bg-white border-b border-neutral-200 px-4 sm:px-6 pt-3">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 shrink-0" />
            <div className="min-w-0 flex-1 flex items-baseline gap-3">
              <div className="h-6 w-32 bg-neutral-200 rounded-md" />
              <div className="h-4 w-24 bg-neutral-100 rounded" />
            </div>
            <div className="hidden sm:flex items-center gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-neutral-200" />
                  <div className="h-3.5 w-16 bg-neutral-100 rounded hidden xl:block" />
                </div>
              ))}
            </div>
          </div>

          {/* Step progress bar */}
          <div className="flex gap-1.5 mt-3">
            <div className="flex-1 h-1 rounded-full bg-neutral-300" />
            <div className="flex-1 h-1 rounded-full bg-neutral-100" />
            <div className="flex-1 h-1 rounded-full bg-neutral-100" />
            <div className="flex-1 h-1 rounded-full bg-neutral-100" />
          </div>
        </div>
      </header>

      {/* Scrollable wizard body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="bg-white card-dash p-4 sm:p-5 space-y-5">
            {/* Tipo de publicación */}
            <div>
              <div className="h-3.5 w-32 bg-neutral-200 rounded mb-2" />
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 rounded-xl border border-neutral-200 bg-neutral-50 p-2.5 space-y-1.5">
                    <div className="h-3.5 w-16 bg-neutral-200 rounded" />
                    <div className="h-2.5 w-12 bg-neutral-100 rounded hidden sm:block" />
                  </div>
                ))}
              </div>
            </div>

            {/* 2-col core fields */}
            <div className="grid md:grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3.5 w-28 bg-neutral-200 rounded" />
                  <div className="h-11 w-full bg-neutral-100 rounded-btn border border-neutral-200" />
                </div>
              ))}
            </div>

            {/* Short description */}
            <div className="space-y-1.5">
              <div className="h-3.5 w-40 bg-neutral-200 rounded" />
              <div className="h-11 w-full bg-neutral-100 rounded-btn border border-neutral-200" />
            </div>

            {/* Full description + Cover upload */}
            <div className="grid lg:grid-cols-[1fr_20rem] gap-4">
              <div className="space-y-1.5">
                <div className="h-3.5 w-36 bg-neutral-200 rounded" />
                <div className="h-40 w-full bg-neutral-100 rounded-btn border border-neutral-200" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3.5 w-32 bg-neutral-200 rounded" />
                <div className="h-40 w-full bg-neutral-50 rounded-xl border-2 border-dashed border-neutral-200" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wizard footer */}
      <footer className="shrink-0 border-t border-neutral-200 bg-white/95 px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="h-10 w-24 bg-neutral-100 rounded-btn" />
          <div className="h-10 w-32 bg-neutral-200 rounded-btn" />
        </div>
      </footer>
    </div>
  );
}
