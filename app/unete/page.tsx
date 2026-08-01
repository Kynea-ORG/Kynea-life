import type { Metadata } from 'next';
import { fetchHomeStats } from '@/lib/stats/queries';
import UneteClient from './UneteClient';

export const metadata: Metadata = {
  title: 'Únete como profesor — Kynea',
  description: 'Publica tus clases de baile gratis y llega a cientos de alumnos en toda Latinoamérica. Sin comisiones.',
};

export default async function UnetePage() {
  const stats = await fetchHomeStats();
  return <UneteClient teacherCount={stats.teachers} />;
}
