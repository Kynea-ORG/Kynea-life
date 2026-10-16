interface ClassCardSkeletonProps {
  compact?: boolean;
  mobileLayout?: 'carousel' | 'row';
}

export default function ClassCardSkeleton({
  compact = false,
  mobileLayout,
}: ClassCardSkeletonProps) {
  return (
    <>
      {mobileLayout && (
        <div className="md:hidden">
          {mobileLayout === 'carousel' ? (
            <div className="relative w-full animate-pulse">
              <div className="relative aspect-[1200/630] overflow-hidden rounded-2xl bg-neutral-100" />
              <div className="pt-3 pb-1 px-0.5 flex flex-col gap-2.5">
                <div className="flex flex-col gap-1.5">
                  <div className="h-3.5 w-24 bg-pink-100/80 rounded-full" />
                  <div className="h-4 w-4/5 bg-neutral-200/80 rounded" />
                </div>
                <div className="h-3 w-1/2 bg-neutral-100 rounded" />
                <div className="h-4 w-20 bg-neutral-200/80 rounded" />
              </div>
            </div>
          ) : (
            <div className="relative flex gap-3.5 py-4 border-b border-neutral-100 last:border-b-0 animate-pulse">
              <div className="shrink-0 w-[108px] h-[108px] rounded-2xl bg-neutral-100 self-center" />
              <div className="min-w-0 flex-1 flex flex-col justify-center gap-2">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-16 bg-pink-100/80 rounded-full" />
                    <div className="h-3 w-12 bg-neutral-100 rounded" />
                  </div>
                  <div className="h-4 w-4/5 bg-neutral-200/80 rounded" />
                </div>
                <div className="h-3 w-1/2 bg-neutral-100 rounded" />
                <div className="h-4 w-20 bg-neutral-200/80 rounded" />
              </div>
            </div>
          )}
        </div>
      )}

      <div
        className={`bg-white border border-neutral-200 rounded-lg overflow-hidden ${
          mobileLayout ? 'hidden md:flex' : 'flex'
        } flex-col animate-pulse`}
      >
        {/* Cover image skeleton */}
        <div className={`relative overflow-hidden ${compact ? 'h-36' : 'h-48'} bg-neutral-100`} />

        {/* Content skeleton */}
        <div className="p-5 flex flex-col flex-1 gap-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-20 rounded-full bg-pink-100/80" />
            <div className="h-5 w-16 rounded bg-neutral-200/70" />
          </div>

          <div className="space-y-2">
            <div className="h-5 w-4/5 rounded bg-neutral-200/80" />
            <div className="h-3.5 w-1/2 rounded bg-neutral-100" />
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="h-3.5 w-3/5 rounded bg-neutral-100" />
            <div className="h-3.5 w-2/5 rounded bg-neutral-100" />
          </div>

          <div className="pt-3 mt-auto border-t border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-neutral-200/80" />
              <div className="h-3.5 w-24 rounded bg-neutral-100" />
            </div>
            <div className="h-8 w-24 rounded-btn bg-neutral-200/80" />
          </div>
        </div>
      </div>
    </>
  );
}
