import { requireRole } from '@/lib/auth/requireRole';
import ImportarCSVClient from './ImportarCSVClient';

export default async function ImportarCSVPage() {
  await requireRole(['profesor', 'academia']);

  return <ImportarCSVClient />;
}
