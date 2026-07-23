import { requireRole } from '@/lib/auth/requireRole';
import ProfesoresClient from './ProfesoresClient';

export default async function ProfesoresPage() {
  await requireRole(['academia']);

  return <ProfesoresClient />;
}
