export default function AdminBlogEditorSkeleton() {
  return (
    <div
      className="min-h-screen bg-white animate-pulse"
      aria-busy="true"
      aria-label="Cargando editor de artículo..."
    >
      {/* Sticky action bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 lg:px-10 py-3.5 border-b border-neutral-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-neutral-100" />
          <div className="h-3.5 w-24 bg-neutral-200 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-32 bg-neutral-100 rounded-btn border border-neutral-200" />
          <div className="h-9 w-24 bg-neutral-200 rounded-btn" />
        </div>
      </div>

      {/* Editable cover + title header */}
      <div className="max-w-[1080px] mx-auto px-6 py-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 sm:gap-12 sm:items-center">
          <div className="aspect-square w-full rounded-2xl bg-neutral-100 border border-neutral-200" />
          <div className="space-y-4">
            <div className="h-7 w-28 bg-neutral-100 rounded-full" />
            <div className="space-y-2.5">
              <div className="h-9 w-full bg-neutral-200 rounded-md" />
              <div className="h-9 w-3/4 bg-neutral-200 rounded-md" />
            </div>
            <div className="space-y-2 pt-1">
              <div className="h-4 w-full bg-neutral-100 rounded" />
              <div className="h-4 w-5/6 bg-neutral-100 rounded" />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <div className="w-8 h-8 rounded-full bg-neutral-200 shrink-0" />
              <div className="h-3.5 w-48 bg-neutral-100 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Accent swatches + featured toggle bar */}
      <div className="border-b border-neutral-100 bg-white px-6 py-4">
        <div className="max-w-[1080px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-3.5 w-28 bg-neutral-100 rounded" />
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-neutral-200" />
              ))}
            </div>
          </div>
          <div className="h-9 w-40 bg-neutral-100 rounded-full border border-neutral-200" />
        </div>
      </div>

      {/* Rich text editor area */}
      <div className="max-w-[760px] mx-auto px-6 pt-10 space-y-4">
        <div className="h-10 w-full bg-neutral-50 border border-neutral-200 rounded-xl" />
        <div className="space-y-3 pt-2">
          <div className="h-4 w-full bg-neutral-100 rounded" />
          <div className="h-4 w-11/12 bg-neutral-100 rounded" />
          <div className="h-4 w-4/5 bg-neutral-100 rounded" />
          <div className="h-4 w-full bg-neutral-100 rounded pt-2" />
          <div className="h-4 w-3/4 bg-neutral-100 rounded" />
        </div>
      </div>

      {/* SEO fields */}
      <div className="max-w-[1080px] mx-auto px-6 pb-16 pt-10">
        <div className="pt-8 border-t border-neutral-100">
          <div className="h-3.5 w-28 bg-neutral-200 rounded mb-6" />
          <div className="space-y-5 max-w-[720px]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3.5 w-36 bg-neutral-200 rounded" />
                <div className={`${i === 2 ? 'h-20' : 'h-11'} w-full bg-neutral-100 rounded-lg border border-neutral-200`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
