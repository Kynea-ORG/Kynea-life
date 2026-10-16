import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ClaseDetailSkeleton() {
  return (
    <div className="min-h-screen bg-white flex flex-col overflow-x-clip">
      {/* Desktop header */}
      <Header className="max-lg:hidden" />

      <div className="max-w-[640px] lg:max-w-[1200px] mx-auto px-4 lg:px-6 pt-0 pb-8 lg:py-8 w-full min-w-0 flex-1">
        {/* Desktop breadcrumbs skeleton */}
        <div className="hidden lg:flex items-center justify-between gap-6 mb-6 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-12 bg-neutral-200/80 rounded" />
            <span className="text-neutral-300">/</span>
            <div className="h-3.5 w-14 bg-neutral-200/80 rounded" />
            <span className="text-neutral-300">/</span>
            <div className="h-3.5 w-20 bg-neutral-200/80 rounded" />
            <span className="text-neutral-300">/</span>
            <div className="h-3.5 w-36 bg-neutral-100 rounded" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-4 w-20 bg-neutral-200/70 rounded" />
            <div className="h-4 w-16 bg-neutral-200/70 rounded" />
          </div>
        </div>

        {/* 2-column layout */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-0 lg:gap-10">
          {/* Left Column */}
          <div className="min-w-0">
            {/* Hero image placeholder with matching exact heights */}
            <div className="relative overflow-hidden -mx-4 lg:mx-0 lg:rounded-xl lg:mb-6 h-[280px] lg:h-[420px] bg-neutral-200/80 animate-pulse" />

            {/* Title & Metadata */}
            <div className="pt-4 lg:pt-0 animate-pulse">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-6 w-20 rounded-full bg-pink-100/80" />
                <div className="h-6 w-24 rounded-full bg-neutral-100" />
              </div>

              <div className="h-8 sm:h-9 w-4/5 max-w-xl bg-neutral-200/80 rounded-lg mb-4" />

              {/* Teacher profile pill */}
              <div className="flex items-center gap-3.5 py-4 border-y border-neutral-100 my-6">
                <div className="w-12 h-12 rounded-full bg-neutral-200/80 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-36 bg-neutral-200/80 rounded" />
                  <div className="h-3.5 w-24 bg-neutral-100 rounded" />
                </div>
              </div>

              {/* Class essentials boxes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-neutral-200/80 space-y-1.5">
                    <div className="h-3 w-16 bg-neutral-100 rounded" />
                    <div className="h-4 w-24 bg-neutral-200/70 rounded" />
                  </div>
                ))}
              </div>

              {/* Description paragraphs */}
              <div className="space-y-2.5 my-8">
                <div className="h-5 w-28 bg-neutral-200/80 rounded mb-3" />
                <div className="h-4 w-full bg-neutral-100 rounded" />
                <div className="h-4 w-11/12 bg-neutral-100 rounded" />
                <div className="h-4 w-4/5 bg-neutral-100 rounded" />
                <div className="h-4 w-3/4 bg-neutral-100 rounded" />
              </div>

              {/* Venue map box skeleton */}
              <div className="my-8 space-y-3">
                <div className="h-5 w-36 bg-neutral-200/80 rounded" />
                <div className="h-48 rounded-2xl bg-neutral-100 border border-neutral-200/80" />
              </div>
            </div>
          </div>

          {/* Right Column — Desktop Sticky Card */}
          <div className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-5 animate-pulse bg-white">
              <div className="flex items-baseline justify-between border-b border-neutral-100 pb-5">
                <div className="space-y-1.5">
                  <div className="h-3.5 w-14 bg-neutral-100 rounded" />
                  <div className="h-8 w-28 bg-neutral-200/80 rounded" />
                </div>
                <div className="h-5 w-20 rounded-full bg-neutral-100" />
              </div>

              <div className="space-y-3">
                <div className="h-12 w-full rounded-xl bg-neutral-200/80" />
                <div className="h-12 w-full rounded-xl bg-neutral-100 border border-neutral-200" />
              </div>

              <div className="space-y-2.5 pt-4 border-t border-neutral-100">
                <div className="h-3.5 w-full bg-neutral-100 rounded" />
                <div className="h-3.5 w-4/5 bg-neutral-100 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
