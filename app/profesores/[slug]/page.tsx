import { notFound } from 'next/navigation';
import { fetchTeacherClasses } from '@/lib/classes/queries';
import { fetchTeacherBySlug } from '@/lib/profiles/queries';
import ProfesorDetailClient from './ProfesorDetailClient';

export default async function ProfesorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const teacher = await fetchTeacherBySlug(slug);
  if (!teacher) notFound();

  const allClasses = await fetchTeacherClasses(teacher.id);
  const classes = allClasses.filter(c => c.status === 'published');
  return <ProfesorDetailClient teacher={teacher} classes={classes} />;
}
