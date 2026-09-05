import type { Metadata } from 'next';
import { Suspense } from 'react';
import { fetchHomeStats } from '@/lib/stats/queries';
import { SITE_URL } from '@/lib/constants';
import UneteClient from './UneteClient';

const title = 'Únete como profesor — Kynea';
const description = 'Publica tus clases de baile gratis y llega a cientos de alumnos en toda Latinoamérica. Sin comisiones.';
const canonical = `${SITE_URL}/unete`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical },
  openGraph: { title, description, url: canonical, type: 'website', images: [{ url: `${SITE_URL}/BG-Registro-Profesores-2.png` }] },
};

export default async function UnetePage() {
  const stats = await fetchHomeStats();
  return (
    <Suspense>
      <UneteClient teacherCount={stats.teachers} />
    </Suspense>
  );
}
