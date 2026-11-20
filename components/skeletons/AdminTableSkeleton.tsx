interface AdminTableSkeletonProps {
  ariaLabel?: string;
  columns?: string;
  showAction?: boolean;
  withRowActions?: boolean;
  showPagination?: boolean;
  rows?: number;
}

export default function AdminTableSkeleton({
  ariaLabel = 'Cargando listado de administración...',
  columns = '1.6fr 2fr 1fr 1.2fr 1.4fr',
  showAction = false,
  withRowActions = false,
  showPagination = false,
  rows = 5,
}: AdminTableSkeletonProps) {
  return (
    <div
      className="p-6 lg:p-8 animate-pulse"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <div className="h-8 w-52 max-w-full bg-neutral-200 rounded-md mb-2" />
          <div className="h-4 w-40 bg-neutral-100 rounded" />
        </div>
        {showAction && (
          <div className="h-10 w-36 bg-neutral-200 rounded-btn shrink-0" />
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white card-dash overflow-hidden">
        <div
          className="grid gap-4 px-6 py-4 border-b border-neutral-100"
          style={{ gridTemplateColumns: columns }}
        >
          {[0, 1, 2, 3, 4].map((col) => (
            <div key={col} className="h-3.5 w-16 bg-neutral-100 rounded" />
          ))}
        </div>
        <div className="divide-y divide-neutral-100">
          {Array.from({ length: rows }).map((_, row) => (
            <div
              key={row}
              className="grid gap-4 items-center px-6 py-4"
              style={{ gridTemplateColumns: columns }}
            >
              <div className="space-y-1.5 min-w-0">
                <div className="h-4 w-3/4 bg-neutral-200 rounded" />
                {withRowActions && <div className="h-3 w-1/2 bg-neutral-100 rounded" />}
              </div>
              <div>
                <div className={`h-4 ${withRowActions ? 'w-24 rounded-full bg-neutral-100' : 'w-4/5 rounded bg-neutral-100'}`} />
              </div>
              <div>
                <div className={`h-5 ${withRowActions ? 'w-20 rounded bg-neutral-100' : 'w-16 rounded-full bg-neutral-100'}`} />
              </div>
              <div>
                <div className="h-3.5 w-20 bg-neutral-100 rounded" />
              </div>
              <div>
                {withRowActions ? (
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-20 bg-neutral-200 rounded-btn" />
                    <div className="h-8 w-20 bg-neutral-100 rounded-btn border border-neutral-200" />
                  </div>
                ) : (
                  <div className="h-3.5 w-24 bg-neutral-100 rounded" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white card-dash p-4 space-y-2.5">
            <div className="h-4 w-40 bg-neutral-200 rounded" />
            <div className="h-3.5 w-48 bg-neutral-100 rounded" />
            <div className="flex items-center gap-2 pt-0.5">
              <div className="h-5 w-20 bg-neutral-100 rounded-full" />
              <div className="h-3.5 w-20 bg-neutral-100 rounded" />
            </div>
            {withRowActions ? (
              <div className="flex items-center gap-2 pt-1">
                <div className="h-9 flex-1 bg-neutral-200 rounded-btn" />
                <div className="h-9 flex-1 bg-neutral-100 rounded-btn border border-neutral-200" />
              </div>
            ) : (
              <div className="h-3.5 w-36 bg-neutral-100 rounded" />
            )}
          </div>
        ))}
      </div>

      {showPagination && (
        <div className="flex items-center justify-between mt-6">
          <div className="h-8 w-20 bg-neutral-100 rounded-btn border border-neutral-200" />
          <div className="h-4 w-28 bg-neutral-100 rounded" />
          <div className="h-8 w-20 bg-neutral-100 rounded-btn border border-neutral-200" />
        </div>
      )}
    </div>
  );
}
