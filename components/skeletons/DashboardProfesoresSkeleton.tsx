export default function DashboardProfesoresSkeleton() {
  return (
    <div
      className="p-6 lg:p-8 max-w-3xl animate-pulse"
      aria-busy="true"
      aria-label="Cargando profesores..."
    >
      {/* Header */}
      <div className="mb-6">
        <div className="h-8 w-36 bg-neutral-200 rounded-md mb-2" />
        <div className="h-4 w-56 bg-neutral-100 rounded" />
      </div>

      {/* Centered content card */}
      <div className="bg-white card-dash p-10 flex flex-col items-center">
        <div className="w-12 h-12 bg-neutral-100 rounded-xl mb-4" />
        <div className="h-5 w-32 bg-neutral-200 rounded mb-3" />
        <div className="h-4 w-72 max-w-full bg-neutral-100 rounded mb-2" />
        <div className="h-4 w-60 max-w-full bg-neutral-100 rounded" />
      </div>
    </div>
  );
}
