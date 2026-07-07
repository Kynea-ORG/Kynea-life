import { notFound } from 'next/navigation';
import { fetchTeacherClasses } from '@/lib/classes/queries';
import { fetchTeacherById } from '@/lib/profiles/queries';
import ProfesorDetailClient from './ProfesorDetailClient';

export default async function ProfesorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [teacher, allClasses] = await Promise.all([
    fetchTeacherById(id),
    fetchTeacherClasses(id),
  ]);

  if (!teacher) notFound();

  const classes = allClasses.filter(c => c.status === 'published');
  return <ProfesorDetailClient teacher={teacher} classes={classes} />;
}
