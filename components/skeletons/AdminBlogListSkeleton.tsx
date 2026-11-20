export default function AdminBlogListSkeleton() {
  return (
    <div
      className="p-6 lg:p-8 animate-pulse"
      aria-busy="true"
      aria-label="Cargando artículos del blog..."
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="h-8 w-28 bg-neutral-200 rounded-md mb-2" />
          <div className="h-4 w-32 bg-neutral-100 rounded" />
        </div>
        <div className="h-10 w-32 bg-neutral-200 rounded-btn shrink-0" />
      </div>

      {/* Posts list card */}
      <div className="bg-white card-dash overflow-hidden">
        <div className="divide-y divide-neutral-100">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-64 max-w-full bg-neutral-200 rounded" />
                  <div className="h-5 w-16 bg-neutral-100 rounded-full shrink-0" />
                </div>
                <div className="h-3 w-52 max-w-full bg-neutral-100 rounded" />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="h-8 w-16 bg-neutral-100 rounded-btn border border-neutral-200" />
                <div className="h-8 w-24 bg-neutral-100 rounded-btn border border-neutral-200 hidden sm:block" />
                <div className="w-8 h-8 bg-neutral-100 rounded-btn border border-neutral-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
