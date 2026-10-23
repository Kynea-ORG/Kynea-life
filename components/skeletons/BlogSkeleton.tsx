import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function BlogSkeleton() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="max-w-[1200px] mx-auto px-6 py-12 flex-1 w-full">
        {/* Blog header */}
        <div className="mb-10 animate-pulse">
          <div className="h-9 sm:h-10 w-56 bg-neutral-200/80 rounded-lg mb-2" />
          <div className="h-4 w-96 max-w-full bg-neutral-100 rounded" />
        </div>

        {/* Featured post skeleton */}
        <div className="grid lg:grid-cols-2 gap-8 bg-neutral-900 rounded-3xl p-6 sm:p-8 lg:p-10 mb-12 animate-pulse">
          <div className="aspect-[16/10] rounded-2xl bg-neutral-800" />
          <div className="flex flex-col justify-center space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-24 bg-pink-500/20 rounded-full" />
              <div className="h-5 w-16 bg-neutral-800 rounded-full" />
            </div>
            <div className="h-8 w-4/5 bg-neutral-800 rounded-lg" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-neutral-800/80 rounded" />
              <div className="h-4 w-5/6 bg-neutral-800/80 rounded" />
            </div>
            <div className="h-10 w-32 bg-neutral-800 rounded-btn pt-2" />
          </div>
        </div>

        {/* Category filter pills skeleton */}
        <div className="flex gap-2.5 overflow-x-auto pb-4 mb-8 animate-pulse">
          {[20, 24, 28, 22, 26].map((w, i) => (
            <div key={i} className="h-9 rounded-full bg-neutral-100 shrink-0" style={{ width: `${w * 4}px` }} />
          ))}
        </div>

        {/* 3-column posts grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col space-y-4 animate-pulse">
              <div className="aspect-[16/10] rounded-2xl bg-neutral-100 overflow-hidden" />
              <div className="space-y-2">
                <div className="h-4 w-20 bg-pink-100/80 rounded-full" />
                <div className="h-5 w-4/5 bg-neutral-200/80 rounded" />
                <div className="h-3.5 w-full bg-neutral-100 rounded" />
                <div className="h-3.5 w-2/3 bg-neutral-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
