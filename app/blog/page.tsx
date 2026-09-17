import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Clock, Rss } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SmartImage from '@/components/SmartImage';
import { SITE_URL } from '@/lib/constants';
import { fetchPublishedPosts, fetchBlogCategories } from '@/lib/blog/queries';
import { estimateReadingTime } from '@/lib/blog/helpers';

export const metadata: Metadata = {
  title: 'Blog — Kynea',
  description: 'Guías, novedades y consejos sobre danza en Latinoamérica: estilos, academias, historias inspiradoras y cómo empezar a bailar.',
  alternates: {
    canonical: `${SITE_URL}/blog`,
    types: { 'application/rss+xml': `${SITE_URL}/blog/rss.xml` },
  },
  openGraph: {
    title: 'Blog — Kynea',
    description: 'Guías, novedades y consejos sobre danza en Latinoamérica.',
    url: `${SITE_URL}/blog`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog — Kynea',
    description: 'Guías, novedades y consejos sobre danza en Latinoamérica.',
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Foto editorial de portada del blog — distinta a la que usa cualquier otra
// sección del sitio (Home usa /Background.webp, perfiles usan su propia
// cover_image), así el blog tiene una identidad visual propia en vez de
// reciclar un fondo ya asociado a otra parte de Kynea.
const HERO_IMAGE = 'https://images.unsplash.com/photo-1555489401-79c274997434?w=1600&q=80';

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const category = (params.categoria as string | undefined) || undefined;

  const [posts, categories] = await Promise.all([
    fetchPublishedPosts(category),
    fetchBlogCategories(),
  ]);

  const [featured, ...rest] = posts;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Blog de Kynea',
    url: `${SITE_URL}/blog`,
    inLanguage: 'es-PE',
    publisher: { '@type': 'Organization', name: 'Kynea', url: SITE_URL },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
    ],
  };
  // ItemList de los posts visibles — le da a Google una lista explícita de
  // URLs del blog más allá del sitemap, con el orden real que ve un lector.
  const itemListJsonLd = posts.length > 0 && {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: posts.map((post, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/blog/${post.slug}`,
      name: post.title,
    })),
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {itemListJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      )}
      <Header />

      {/* Portada editorial: foto real + degradado, mismo lenguaje que el
          hero del Home (foto + overlay oscuro), en vez del bloque de color
          plano que tenía antes — le da al blog una identidad de revista en
          vez de sentirse una página administrativa más. */}
      <div className="relative bg-neutral-900 pt-16 pb-24 sm:pt-20 sm:pb-28 overflow-hidden">
        <div className="absolute inset-0">
          <SmartImage
            src={HERO_IMAGE}
            alt=""
            aria-hidden="true"
            fill
            sizes="1600px"
            priority
            className="object-cover opacity-45"
            style={{ objectPosition: '50% 25%' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(13,13,13,.55) 0%, rgba(13,13,13,.55) 40%, rgba(13,13,13,.96) 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(100deg, rgba(138,17,188,.35) 0%, rgba(13,13,13,0) 55%)' }} />
        </div>

        <div className="relative max-w-[1200px] mx-auto px-6">
          <span className="text-[12px] font-bold uppercase tracking-widest text-primary-bg/90">El blog de Kynea</span>
          <h1 className="text-[38px] sm:text-[52px] font-black text-white tracking-tight leading-[1.08] mt-3 max-w-[16ch]">
            Historias y guías para vivir la danza en Latinoamérica.
          </h1>
          <p className="text-white/70 text-[16px] sm:text-[17px] mt-4 max-w-[56ch] leading-relaxed">
            Estilos, academias, bienestar y las historias de quienes se animaron a bailar.
          </p>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 -mt-10 mb-10 relative z-10">
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Link
                href="/blog"
                className={`text-[13px] font-semibold px-3.5 py-1.5 rounded-full border shadow-sm transition-colors ${
                  !category ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-900'
                }`}
              >
                Todas
              </Link>
              {categories.map(c => (
                <Link
                  key={c}
                  href={`/blog?categoria=${encodeURIComponent(c)}`}
                  className={`text-[13px] font-semibold px-3.5 py-1.5 rounded-full border shadow-sm transition-colors ${
                    category === c ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-900'
                  }`}
                >
                  {c}
                </Link>
              ))}
            </div>
          )}
          <a
            href="/blog/rss.xml"
            className="flex items-center gap-1.5 text-[12.5px] font-semibold text-neutral-400 hover:text-neutral-700 transition-colors shrink-0"
          >
            <Rss className="w-3.5 h-3.5" /> RSS
          </a>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-24 text-neutral-400">
            <p className="text-[15px]">
              {category ? `Todavía no hay posts en "${category}".` : 'Todavía no hay posts publicados.'}
            </p>
          </div>
        ) : (
          <div className="pb-16">
            {/* Destacado — el más reciente, a página completa con el texto
                sobre la propia foto (portada de revista), en vez de una
                card partida en dos: mucho más protagonismo visual para el
                artículo que más importa mostrar. */}
            <Link
              href={`/blog/${featured.slug}`}
              className="group relative block w-full aspect-[16/10] sm:aspect-[21/9] rounded-2xl overflow-hidden mb-14"
            >
              {featured.coverImage ? (
                <SmartImage
                  src={featured.coverImage}
                  alt={featured.title}
                  fill
                  sizes="1200px"
                  priority
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                  style={{ objectPosition: featured.coverImagePosition }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary-bg to-neutral-100" />
              )}
              <div
                className="absolute inset-0"
                style={{ backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.05) 75%)' }}
              />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 max-w-[760px]">
                <span className="inline-block text-[11px] font-bold uppercase tracking-wide text-white bg-primary rounded-full px-3 py-1 mb-4">
                  Destacado{featured.category ? ` · ${featured.category}` : ''}
                </span>
                <h2 className="text-[24px] sm:text-[34px] font-black text-white leading-[1.12] tracking-tight mb-3">
                  {featured.title}
                </h2>
                {featured.excerpt && (
                  <p className="hidden sm:block text-[15px] text-white/75 leading-relaxed line-clamp-2 mb-5 max-w-[64ch]">
                    {featured.excerpt}
                  </p>
                )}
                <div className="flex items-center gap-3 text-[12.5px] text-white/60">
                  {featured.publishedAt && <span>{formatDate(featured.publishedAt)}</span>}
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {estimateReadingTime(featured.content)} min</span>
                  <span className="hidden sm:flex items-center gap-1.5 text-white font-bold ml-2 group-hover:gap-2.5 transition-[gap]">
                    Leer artículo <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>

            {rest.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map(post => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group flex flex-col rounded-2xl border border-neutral-200 overflow-hidden transition-[box-shadow,border-color,transform] duration-150 ease-out hover:border-neutral-300 hover:shadow-[0_12px_28px_rgba(17,17,17,0.08)] hover:-translate-y-0.5"
                  >
                    <div className="relative w-full aspect-[16/10] overflow-hidden bg-neutral-100">
                      {post.coverImage ? (
                        <SmartImage
                          src={post.coverImage}
                          alt={post.title}
                          fill
                          sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 90vw"
                          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                          style={{ objectPosition: post.coverImagePosition }}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-bg to-neutral-100" />
                      )}
                      <span className="absolute top-3 right-3 flex items-center gap-1 text-[11px] font-semibold text-white bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
                        <Clock className="w-3 h-3" /> {estimateReadingTime(post.content)} min
                      </span>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      {post.category && (
                        <span className="text-[11px] font-bold uppercase tracking-wide text-primary mb-2">{post.category}</span>
                      )}
                      <h2 className="text-[17px] font-bold text-neutral-900 leading-snug mb-2">{post.title}</h2>
                      {post.excerpt && (
                        <p className="text-[13.5px] text-neutral-600 leading-relaxed line-clamp-3 mb-3">{post.excerpt}</p>
                      )}
                      {post.publishedAt && (
                        <p className="text-[12px] text-neutral-400 mt-auto">{formatDate(post.publishedAt)}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
