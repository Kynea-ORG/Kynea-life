import AdminTableSkeleton from '@/components/skeletons/AdminTableSkeleton';

export default function AdminUsuariosLoading() {
  return (
    <AdminTableSkeleton
      ariaLabel="Cargando usuarios..."
      columns="1.6fr 2fr 1fr 1.2fr 1.4fr"
      showAction
      showPagination
    />
  );
}
