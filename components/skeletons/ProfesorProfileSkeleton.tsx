import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ProfesorProfileSkeleton() {
  return (
    <div
      className="min-h-screen bg-neutral-900 overflow-x-clip flex flex-col"
      aria-busy="true"
      aria-label="Cargando perfil..."
      style={{
        backgroundImage: 'url(/Background-BK.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Header />

      {/* Dark editorial hero */}
      <div className="relative overflow-hidden pt-10 pb-11 md:pb-14 bg-neutral-900/90 border-b border-neutral-800">
        <div className="relative z-10 max-w-[1200px] mx-auto px-6">
          {/* Back link skeleton */}
          <div className="h-4 w-28 bg-neutral-800 rounded animate-pulse mb-8" />

          {/* Profile header row */}
          <div className="flex flex-wrap items-start gap-7">
            {/* Avatar 192px circular skeleton */}
            <div className="w-36 h-36 md:w-48 md:h-48 rounded-full bg-neutral-800 shrink-0 animate-pulse border-2 border-neutral-700/60" />

            <div className="flex-1 min-w-[280px] space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-4 w-24 bg-pink-500/20 rounded-full" />
                <div className="h-4 w-20 bg-neutral-800 rounded-full" />
              </div>

              <div className="h-9 md:h-11 w-3/4 max-w-md bg-neutral-800 rounded-lg" />

              <div className="flex flex-wrap gap-2 pt-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-7 w-20 rounded-full bg-neutral-800" />
                ))}
              </div>

              {/* Bio lines */}
              <div className="space-y-2 pt-2 max-w-xl">
                <div className="h-4 w-full bg-neutral-800/80 rounded" />
                <div className="h-4 w-5/6 bg-neutral-800/80 rounded" />
                <div className="h-4 w-3/4 bg-neutral-800/80 rounded" />
              </div>

              {/* Social buttons */}
              <div className="flex gap-3 pt-3">
                <div className="h-10 w-32 bg-neutral-800 rounded-btn" />
                <div className="h-10 w-10 bg-neutral-800 rounded-btn" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4-item stats strip skeleton */}
      <div className="border-b border-neutral-800 bg-neutral-900/95 py-6">
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-16 bg-neutral-800 rounded" />
              <div className="h-5 w-28 bg-neutral-700/70 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Classes list section */}
      <main className="max-w-[1200px] mx-auto px-6 py-12 flex-1 w-full">
        <div className="h-7 w-44 bg-neutral-800 rounded animate-pulse mb-8" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-800/40 overflow-hidden animate-pulse">
              <div className="h-48 bg-neutral-800" />
              <div className="p-5 space-y-3">
                <div className="h-5 w-20 bg-neutral-700 rounded-full" />
                <div className="h-5 w-4/5 bg-neutral-700 rounded" />
                <div className="h-4 w-1/2 bg-neutral-800 rounded" />
                <div className="pt-3 border-t border-neutral-800 flex justify-between items-center">
                  <div className="h-4 w-16 bg-neutral-800 rounded" />
                  <div className="h-8 w-24 bg-neutral-700 rounded-btn" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
