import type { Metadata } from 'next';
import { fetchHomeStats } from '@/lib/stats/queries';
import BeneficiosClient from './BeneficiosClient';

export const metadata: Metadata = {
  title: 'Beneficios de enseñar en Kynea — Kynea',
  description: 'Descubre por qué cientos de profesores de baile en Latinoamérica ya publican sus clases en Kynea.',
};

export default async function BeneficiosPage() {
  const stats = await fetchHomeStats();
  return <BeneficiosClient teacherCount={stats.teachers} classCount={stats.classes} cityCount={stats.cities} />;
}
