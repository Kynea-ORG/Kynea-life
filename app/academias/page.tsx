import type { Metadata } from 'next';
import { fetchHomeStats } from '@/lib/stats/queries';
import AcademiasClient from './AcademiasClient';

export const metadata: Metadata = {
  title: 'Registra tu academia — Kynea',
  description: 'Publica todas las clases de tu academia en un solo lugar y llega a cientos de alumnos en toda Latinoamérica. Sin comisiones.',
};

export default async function AcademiasPage() {
  const stats = await fetchHomeStats();
  return <AcademiasClient teacherCount={stats.teachers} />;
}
