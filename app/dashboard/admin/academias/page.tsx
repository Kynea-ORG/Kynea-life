import { fetchPendingAcademiaRequests } from '@/lib/admin/queries';
import SolicitudesAcademiaClient from './SolicitudesAcademiaClient';

export default async function AcademiaRequestsPage() {
  const requests = await fetchPendingAcademiaRequests();
  return <SolicitudesAcademiaClient requests={requests} />;
}
