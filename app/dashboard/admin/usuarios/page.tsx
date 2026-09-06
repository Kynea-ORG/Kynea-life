import { redirect } from 'next/navigation';
import { fetchAdminCreatedUsers } from '@/lib/admin/queries';
import UsuariosClient from '../UsuariosClient';

export const dynamic = 'force-dynamic';

function parsePage(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: rawPage } = await searchParams;
  const page = parsePage(rawPage);

  const data = await fetchAdminCreatedUsers(page);

  if (data.users.length === 0 && page > 1) {
    redirect('/dashboard/admin/usuarios');
  }

  return <UsuariosClient {...data} />;
}
