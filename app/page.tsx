import { fetchPublishedClasses } from '@/lib/classes/queries';
import { selectHomeRecommendedClasses } from '@/lib/classes/homeRecommendations';
import { fetchFeaturedProfiles } from '@/lib/profiles/queries';
import { fetchDanceStyles } from '@/lib/catalog/queries';
import { fetchHomeStats } from '@/lib/stats/queries';
import { buildAiSuggestions, computeCatalogSignals } from '@/lib/search/catalogSignals';
import { createClient } from '@/lib/supabase/server';
import { SITE_URL } from '@/lib/constants';
import { safeJsonLd } from '@/lib/utils';
import HomeClient from './HomeClient';
import AuthErrorBanner from '@/components/AuthErrorBanner';

// Un estilo con más de este número de clases publicadas (como estilo
// principal o secundario) se gana su propia fila destacada en el Home —
// dinámico según el catálogo real, en vez de una lista fija a mano.
const MIN_CLASSES_FOR_FEATURED_ROW = 4;

export default async function Page() {
  const supabase = await createClient();
  const [classes, teachers, academias, danceStyles, stats, { data: { user } }] = await Promise.all([
    fetchPublishedClasses(),
    fetchFeaturedProfiles('profesor', 6),
    fetchFeaturedProfiles('academia', 4),
    fetchDanceStyles(),
    fetchHomeStats(),
    supabase.auth.getUser(),
  ]);

  let userRole: 'alumno' | 'profesor' | 'academia' | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    userRole = profile?.role ?? null;
  }

  const styleNamesWithClasses = new Set<string>();
  const classesByStyle = new Map<string, typeof classes>();
  for (const cls of classes) {
    if (cls.style) styleNamesWithClasses.add(cls.style);
    for (const style of [cls.style, ...(cls.secondaryStyles ?? [])]) {
      if (!style) continue;
      styleNamesWithClasses.add(style);
      const existing = classesByStyle.get(style);
      if (existing) existing.push(cls);
      else classesByStyle.set(style, [cls]);
    }
  }

  const danceStylesWithClasses = danceStyles.filter(s => styleNamesWithClasses.has(s.name));

  const featuredCategories = [...classesByStyle.entries()]
    .filter(([, styleClasses]) => styleClasses.length > MIN_CLASSES_FOR_FEATURED_ROW)
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([style, styleClasses]) => ({ style, classes: styleClasses }));

  // "Clases de baile para ti" — un subset acotado y con tope por profesor.
  // Ya no se serializan todas las clases al cliente, ahorrando ~81 KB de payload.
  const recommendedClasses = selectHomeRecommendedClasses(classes);

  // Sugerencias del buscador con IA: solo lo que el catálogo real respalda.
  const aiSuggestions = buildAiSuggestions(computeCatalogSignals(classes));

  const homeJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: 'Kynea',
        description: 'Plataforma para buscar y descubrir clases de baile en Latinoamérica.',
        inLanguage: 'es',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/buscar?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'Kynea',
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
        sameAs: [
          'https://www.instagram.com/kynea.danza',
          'https://www.tiktok.com/@kynea.danza',
        ],
      },
      {
        '@type': 'ItemList',
        '@id': `${SITE_URL}/#navigation`,
        name: 'Navegación principal',
        itemListElement: [
          {
            '@type': 'SiteNavigationElement',
            position: 1,
            name: 'Clases de baile',
            description: 'Explora y filtra clases de danza por estilo, nivel y ciudad.',
            url: `${SITE_URL}/clases`,
          },
          {
            '@type': 'SiteNavigationElement',
            position: 2,
            name: 'Profesores y Academias',
            description: 'Descubre instructores y academias de baile verificadas.',
            url: `${SITE_URL}/profesores`,
          },
          {
            '@type': 'SiteNavigationElement',
            position: 3,
            name: 'Únete como profesor',
            description: 'Publica tus clases de baile gratis y conecta con nuevos alumnos.',
            url: `${SITE_URL}/unete`,
          },
          {
            '@type': 'SiteNavigationElement',
            position: 4,
            name: 'Registra tu academia',
            description: 'Gestiona la oferta de tu estudio de baile en un solo lugar.',
            url: `${SITE_URL}/academias`,
          },
          {
            '@type': 'SiteNavigationElement',
            position: 5,
            name: 'Iniciar sesión',
            description: 'Accede a tu cuenta de Kynea.',
            url: `${SITE_URL}/login`,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: '¿Qué es Kynea y para qué sirve?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Kynea es la plataforma líder en Latinoamérica para buscar y descubrir clases de baile. Conecta a alumnos directamente con profesores independientes y academias verificadas sin intermediarios ni comisiones.',
            },
          },
          {
            '@type': 'Question',
            name: '¿Cómo me contacto con un profesor o academia en Kynea?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'El contacto es 100% directo. En cada clase o perfil de profesor encontrarás enlaces para comunicarte al instante por WhatsApp o Instagram.',
            },
          },
          {
            '@type': 'Question',
            name: '¿Cómo puedo publicar mis clases de danza en Kynea?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Solo debes registrarte como profesor o academia desde la sección "Únete", completar tu perfil profesional y publicar tus clases con horarios, estilos y ubicación.',
            },
          },
          {
            '@type': 'Question',
            name: '¿Tiene algún costo para los alumnos buscar clases?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No, para los alumnos buscar y explorar clases en Kynea es completamente gratuito.',
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <link rel="preconnect" href="https://ik.imagekit.io" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://ik.imagekit.io" />

      <link
        rel="preload"
        as="image"
        type="image/webp"
        href="/Background-Mobile.webp"
        media="(max-width: 767px)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        type="image/webp"
        href="/Background.webp"
        media="(min-width: 768px)"
        fetchPriority="high"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(homeJsonLd) }}
      />
      <AuthErrorBanner />
      <HomeClient
        recommendedClasses={recommendedClasses}
        featuredCategories={featuredCategories}
        initialTeachers={teachers}
        initialAcademias={academias}
        danceStyles={danceStyles}
        danceStylesWithClasses={danceStylesWithClasses}
        stats={stats}
        userRole={userRole}
        aiSuggestions={aiSuggestions}
      />
    </>
  );
}
