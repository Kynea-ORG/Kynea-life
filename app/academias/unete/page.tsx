import type { Metadata } from 'next';
import { Suspense } from 'react';
import { fetchHomeStats } from '@/lib/stats/queries';
import { SITE_URL } from '@/lib/constants';
import AcademiasClient from './AcademiasClient';

const title = 'Registra tu academia — Kynea';
const description = 'Publica todas las clases de tu academia en un solo lugar y llega a cientos de alumnos en toda Latinoamérica. Sin comisiones.';
const canonical = `${SITE_URL}/academias/unete`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical },
  openGraph: { title, description, url: canonical, type: 'website' },
};

export default async function AcademiasUnetePage() {
  const stats = await fetchHomeStats();
  return (
    <Suspense>
      <AcademiasClient teacherCount={stats.teachers} />
    </Suspense>
  );
}
