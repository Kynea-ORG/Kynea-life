import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/onboarding',
        '/completar-registro',
        // Carry PII/tokens in the query string (email, recovery token) — never index.
        '/confirmar-email',
        '/reset-password',
        '/coming-soon',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
