import { fetchAdminProfesores } from '@/lib/admin/queries';
import ProfesorasClient from './ProfesorasClient';

export const dynamic = 'force-dynamic';

function parsePage(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

export default async function AdminProfesorasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: rawPage } = await searchParams;
  const search = (q ?? '').trim().slice(0, 80);
  const data = await fetchAdminProfesores({ search, page: parsePage(rawPage) });

  // key: al cambiar de búsqueda/página el estado de los interruptores se reinicia con los datos nuevos
  return <ProfesorasClient key={`${search}-${data.page}`} {...data} search={search} />;
}
