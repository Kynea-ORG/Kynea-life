import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Iniciar sesión — Kynea',
  description: 'Inicia sesión en tu cuenta de Kynea para acceder a tus clases de baile guardadas o gestionar tu perfil de profesor o academia.',
  alternates: { canonical: `${SITE_URL}/login` },
  openGraph: {
    title: 'Iniciar sesión — Kynea',
    description: 'Inicia sesión en tu cuenta de Kynea para acceder a tus clases de baile guardadas o gestionar tu perfil de profesor o academia.',
    url: `${SITE_URL}/login`,
    type: 'website',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
