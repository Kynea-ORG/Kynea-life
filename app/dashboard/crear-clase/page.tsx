import { fetchClassById } from '@/lib/classes/queries';
import { fetchDanceStyles, fetchClassLevels, fetchDistricts } from '@/lib/catalog/queries';
import CrearClaseForm from './CrearClaseForm';
import type { DanceClass } from '@/lib/types';

interface PageProps {
  searchParams: Promise<{ edit?: string }>;
}

export default async function CrearClasePage({ searchParams }: PageProps) {
  const params = await searchParams;

  const [danceStyles, levels, allDistricts, editClass] = await Promise.all([
    fetchDanceStyles(),
    fetchClassLevels(),
    fetchDistricts(),
    params.edit ? fetchClassById(params.edit) : Promise.resolve(null),
  ]);

  return (
    <CrearClaseForm
      key={params.edit ?? 'new'}
      classId={params.edit ?? null}
      editClass={editClass as DanceClass | null}
      danceStyles={danceStyles.map(s => s.name)}
      levels={levels.map(l => l.name)}
      allDistricts={allDistricts}
    />
  );
}
