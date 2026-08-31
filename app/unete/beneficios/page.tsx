import type { Metadata } from 'next';
import { fetchHomeStats } from '@/lib/stats/queries';
import { SITE_URL } from '@/lib/constants';
import BeneficiosClient from './BeneficiosClient';

const title = 'Beneficios de enseñar en Kynea — Kynea';
const description = 'Descubre por qué cientos de profesores de baile en Latinoamérica ya publican sus clases en Kynea.';
const canonical = `${SITE_URL}/unete/beneficios`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical },
  openGraph: { title, description, url: canonical, type: 'website', images: [{ url: `${SITE_URL}/BG-Registro-Profesores-2.png` }] },
};

export default async function BeneficiosPage() {
  const stats = await fetchHomeStats();
  return <BeneficiosClient teacherCount={stats.teachers} classCount={stats.classes} cityCount={stats.cities} />;
}
