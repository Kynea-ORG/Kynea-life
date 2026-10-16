export default function BlogPostSkeleton() {
  return (
    <div className="min-h-screen bg-white animate-pulse" aria-busy="true" aria-label="Cargando artículo...">
      {/* Header mock */}
      <div className="h-16 border-b border-neutral-100 bg-white" />

      {/* Hero / Cover Section */}
      <div className="border-b border-neutral-100">
        <div className="max-w-[1080px] mx-auto px-6 pt-8 sm:pt-12 pb-8 sm:pb-12">
          {/* Breadcrumb skeleton */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-3.5 w-12 bg-neutral-200 rounded" />
            <div className="h-3 w-3 bg-neutral-200 rounded-full" />
            <div className="h-3.5 w-32 bg-neutral-200 rounded" />
          </div>

          <div className="grid gap-8 sm:grid-cols-2 sm:gap-12 sm:items-center">
            {/* Text details (order 2 on mobile, 2 on desktop) */}
            <div className="sm:order-2">
              {/* Category pill */}
              <div className="h-5 w-24 bg-neutral-200 rounded-full mb-4" />

              {/* Title lines */}
              <div className="space-y-2.5 mb-4">
                <div className="h-8 sm:h-9 w-11/12 bg-neutral-200 rounded-md" />
                <div className="h-8 sm:h-9 w-3/4 bg-neutral-200 rounded-md" />
              </div>

              {/* Excerpt / Dek */}
              <div className="space-y-2 mb-6">
                <div className="h-4 w-full bg-neutral-100 rounded" />
                <div className="h-4 w-5/6 bg-neutral-100 rounded" />
              </div>

              {/* Author & metadata byline */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-full bg-neutral-200 shrink-0" />
                <div className="h-3.5 w-48 bg-neutral-200 rounded" />
              </div>

              {/* Share icon row */}
              <div className="flex items-center gap-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-9 h-9 rounded-full bg-neutral-100 shrink-0" />
                ))}
              </div>
            </div>

            {/* Square cover image (order 1 on desktop) */}
            <div className="relative w-full aspect-square rounded-lg bg-neutral-200 sm:order-1" />
          </div>
        </div>
      </div>

      {/* Article Content & Table of Contents */}
      <div className="max-w-[1080px] mx-auto px-6 pt-10 pb-10 sm:pb-14">
        <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-12">
          {/* Main article text skeleton */}
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="h-4 w-full bg-neutral-100 rounded" />
              <div className="h-4 w-full bg-neutral-100 rounded" />
              <div className="h-4 w-11/12 bg-neutral-100 rounded" />
              <div className="h-4 w-4/5 bg-neutral-100 rounded" />
            </div>

            <div className="space-y-3">
              <div className="h-6 w-1/3 bg-neutral-200 rounded-md mb-2" />
              <div className="h-4 w-full bg-neutral-100 rounded" />
              <div className="h-4 w-full bg-neutral-100 rounded" />
              <div className="h-4 w-3/4 bg-neutral-100 rounded" />
            </div>

            {/* Embedded block / quote mock */}
            <div className="h-28 rounded-lg bg-neutral-100 border border-neutral-200" />

            <div className="space-y-3">
              <div className="h-6 w-2/5 bg-neutral-200 rounded-md mb-2" />
              <div className="h-4 w-full bg-neutral-100 rounded" />
              <div className="h-4 w-full bg-neutral-100 rounded" />
              <div className="h-4 w-5/6 bg-neutral-100 rounded" />
            </div>
          </div>

          {/* Table of contents sidebar (desktop) */}
          <aside className="hidden lg:block space-y-3">
            <div className="h-4 w-28 bg-neutral-200 rounded mb-4" />
            <div className="space-y-2.5 border-l-2 border-neutral-100 pl-3">
              <div className="h-3 w-32 bg-neutral-100 rounded" />
              <div className="h-3 w-40 bg-neutral-100 rounded" />
              <div className="h-3 w-28 bg-neutral-100 rounded" />
              <div className="h-3 w-36 bg-neutral-100 rounded" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
