import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function DirectoryGridSkeleton({
  title,
  subtitle,
}: {
  title?: string;
  subtitle?: string;
} = {}) {
  return (
    <div className="min-h-screen bg-white flex flex-col" aria-busy="true" aria-label="Cargando directorio...">
      <Header />

      <main className="max-w-[1200px] mx-auto px-6 py-12 flex-1 w-full">
        <div className="mb-10">
          {title ? (
            <h1 className="text-[36px] font-black tracking-tight text-neutral-900 mb-2">{title}</h1>
          ) : (
            <div className="h-9 w-64 bg-neutral-200/80 rounded-lg mb-2 animate-pulse" />
          )}
          {subtitle ? (
            <p className="text-neutral-600 text-[15px]">{subtitle}</p>
          ) : (
            <div className="h-4 w-96 max-w-full bg-neutral-100 rounded animate-pulse" />
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-xs flex flex-col animate-pulse"
            >
              <div className="w-full h-48 bg-neutral-100" />
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="h-4 w-4/5 bg-neutral-200/80 rounded" />
                  <div className="h-3 w-1/2 bg-neutral-100 rounded" />
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <div className="h-3 w-1/3 bg-neutral-100 rounded" />
                  <div className="h-6 w-16 bg-neutral-200/60 rounded-full" />
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
