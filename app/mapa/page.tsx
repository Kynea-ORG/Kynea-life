import { fetchPublishedClasses } from '@/lib/classes/queries';
import MapaClient from './MapaClient';

export default async function MapaPage() {
  const allClasses = await fetchPublishedClasses();
  const classesWithCoords = allClasses.filter(c => c.lat != null && c.lng != null);
  return <MapaClient classes={classesWithCoords} />;
}
