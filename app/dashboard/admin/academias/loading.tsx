import AdminTableSkeleton from '@/components/skeletons/AdminTableSkeleton';

export default function AdminAcademiasLoading() {
  return (
    <AdminTableSkeleton
      ariaLabel="Cargando solicitudes de academia..."
      columns="1.6fr 1.3fr 1fr 1.2fr 1.6fr"
      withRowActions
    />
  );
}
