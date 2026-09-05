import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Crear cuenta de alumno — Kynea',
  description: 'Regístrate gratis en Kynea para guardar clases de baile en tus favoritos y contactar a los mejores profesores y academias.',
  alternates: { canonical: `${SITE_URL}/registro` },
  openGraph: {
    title: 'Crear cuenta de alumno — Kynea',
    description: 'Regístrate gratis en Kynea para guardar clases de baile en tus favoritos y contactar a los mejores profesores y academias.',
    url: `${SITE_URL}/registro`,
    type: 'website',
  },
};

export default function RegistroLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
