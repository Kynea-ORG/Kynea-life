import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ClassCardSkeleton from './ClassCardSkeleton';

export default function ClasesCatalogSkeleton() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      {/* Sticky search & filter bar skeleton */}
      <div className="border-b border-neutral-200 bg-white sticky top-16 z-20 py-3 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-3">
          <div className="flex-1 max-w-xl h-11 bg-neutral-100 rounded-full border border-neutral-200/80 animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="h-10 w-24 bg-neutral-100 rounded-btn border border-neutral-200/80 animate-pulse hidden sm:block" />
            <div className="h-10 w-10 sm:w-28 bg-neutral-100 rounded-btn border border-neutral-200/80 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="mx-auto flex gap-8 max-w-[1200px] px-4 sm:px-6 py-8 flex-1 w-full">
        {/* Sidebar skeleton — Desktop */}
        <aside className="hidden md:block w-60 shrink-0">
          <div className="sticky top-36 flex flex-col gap-6 animate-pulse">
            <div className="h-5 w-20 bg-neutral-200/80 rounded" />

            {/* Filter group 1: Estilos */}
            <div className="space-y-2.5 pb-5 border-b border-neutral-100">
              <div className="h-4 w-16 bg-neutral-200/70 rounded" />
              <div className="space-y-2 pt-1">
                {[44, 52, 38, 48].map((w, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded bg-neutral-100" />
                    <div className="h-3.5 rounded bg-neutral-100" style={{ width: `${w}%` }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Filter group 2: Niveles */}
            <div className="space-y-2.5 pb-5 border-b border-neutral-100">
              <div className="h-4 w-14 bg-neutral-200/70 rounded" />
              <div className="space-y-2 pt-1">
                {[50, 42, 60].map((w, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded bg-neutral-100" />
                    <div className="h-3.5 rounded bg-neutral-100" style={{ width: `${w}%` }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Filter group 3: Modalidad */}
            <div className="space-y-2.5">
              <div className="h-4 w-20 bg-neutral-200/70 rounded" />
              <div className="space-y-2 pt-1">
                {[48, 40].map((w, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded bg-neutral-100" />
                    <div className="h-3.5 rounded bg-neutral-100" style={{ width: `${w}%` }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Results grid skeleton */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Result count line */}
          <div className="flex items-center justify-between mb-6 animate-pulse">
            <div className="h-4 w-44 bg-neutral-200/80 rounded" />
          </div>

          {/* Cards grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0 md:gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ClassCardSkeleton key={i} mobileLayout="row" />
            ))}
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
