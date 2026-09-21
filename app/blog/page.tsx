import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Clock, Rss } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SmartImage from '@/components/SmartImage';
import { SITE_URL } from '@/lib/constants';
import { fetchPublishedPosts, fetchBlogCategories } from '@/lib/blog/queries';
import { estimateReadingTime, pickFeaturedPost } from '@/lib/blog/helpers';

const BLOG_TITLE = 'Blog — Kynea';
const BLOG_DESCRIPTION = 'Guías, novedades y consejos sobre danza en Latinoamérica: estilos, academias, historias inspiradoras y cómo empezar a bailar.';
// Fallback cuando el blog no tiene ningún post con portada todavía (o
// ninguno publicado) — sin esto, compartir /blog en WhatsApp/redes mostraba
// un link sin ninguna imagen de vista previa. No es 1200×630 (el estándar
// de OG), pero es preferible a no tener nada mientras no exista un asset
// dedicado — los charts sociales igual la recortan al centro.
const BLOG_FALLBACK_IMAGE = `${SITE_URL}/img-portada-kynea.png`;

// generateMetadata (no un objeto estático) porque la imagen de og:image usa
// la portada del post destacado — necesita la misma consulta que ya hace el
// componente de la página (fetchPublishedPosts está cacheada, así que no es
// una segunda llamada real a la base de datos).
export async function generateMetadata(): Promise<Metadata> {
  const posts = await fetchPublishedPosts();
  const featured = pickFeaturedPost(posts);
  // Mismo criterio que app/blog/[slug]/page.tsx: coverImage puede guardarse
  // como ruta relativa (subida directa a Supabase Storage sin dominio) o ya
  // absoluta — normalizar acá evita un og:image roto en el primer caso.
  const featuredImage = featured?.coverImage
    ? (featured.coverImage.startsWith('http') ? featured.coverImage : `${SITE_URL}${featured.coverImage}`)
    : undefined;
  const image = featuredImage || BLOG_FALLBACK_IMAGE;

  return {
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    alternates: {
      canonical: `${SITE_URL}/blog`,
      types: { 'application/rss+xml': `${SITE_URL}/blog/rss.xml` },
    },
    openGraph: {
      title: BLOG_TITLE,
      description: BLOG_DESCRIPTION,
      url: `${SITE_URL}/blog`,
      siteName: 'Kynea',
      locale: 'es_PE',
      type: 'website',
      images: [{ url: image }],
    },
    twitter: {
      card: 'summary_large_image',
      title: BLOG_TITLE,
      description: BLOG_DESCRIPTION,
      images: [image],
    },
  };
}

// Fecha + hora — antes solo se mostraba la fecha, y ni eso si publishedAt
// era null (posts creados directo en 'published' vía admin sin pasar por un
// flujo que setee published_at). displayDate() abajo cubre ese caso con
// fallback a createdAt, que sí es NOT NULL siempre.
function formatDate(iso: string): string {
  const date = new Date(iso);
  const datePart = date.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
  const timePart = date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
}

function displayDate(post: { publishedAt?: string; createdAt: string }): string {
  return formatDate(post.publishedAt ?? post.createdAt);
}

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

  // El destacado prioriza el/los posts marcados is_featured=true (el más
  // reciente entre ellos, por el mismo orden de fetchPublishedPosts) — antes
  // era siempre implícitamente el más reciente, sin ningún control
  // editorial. Sin ningún post marcado, cae al comportamiento de siempre.
  const featured = pickFeaturedPost(posts);
  const rest = posts.filter(p => p.id !== featured?.id);
  // Mismo criterio de normalización que generateMetadata() más abajo.
  const featuredImage = featured?.coverImage
    ? (featured.coverImage.startsWith('http') ? featured.coverImage : `${SITE_URL}${featured.coverImage}`)
    : undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Blog de Kynea',
    url: `${SITE_URL}/blog`,
    description: BLOG_DESCRIPTION,
    inLanguage: 'es-PE',
    ...(featuredImage && { image: featuredImage }),
    publisher: { '@type': 'Organization', name: 'Kynea', url: SITE_URL, logo: `${SITE_URL}/logo.png` },
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

      {/* Portada tipográfica: título + intro sobre el fondo blanco del
          resto del sitio, sin foto de stock — un blog editorial se lee
          bien sin una imagen genérica de portada, y evita el problema de
          fondo (banner que a veces queda casi negro según qué tan oscura
          sea la foto de turno detrás del degradado). Mismo tratamiento
          tipográfico que un h1 normal de Kynea (font-black, tracking-tight),
          no un one-off "modo revista". */}
      <div className="border-b border-neutral-100 bg-neutral-50">
        <div className="max-w-[1200px] mx-auto px-6 pt-14 pb-10 sm:pt-20 sm:pb-14">
          <span className="text-[12px] font-bold uppercase tracking-widest text-primary">El blog de Kynea</span>
          <h1 className="text-[34px] sm:text-[48px] font-black text-neutral-900 tracking-tight leading-[1.08] mt-3 max-w-[18ch]">
            Historias y guías para vivir la danza en Latinoamérica.
          </h1>
          <p className="text-neutral-600 text-[15px] sm:text-[17px] mt-4 max-w-[56ch] leading-relaxed">
            Estilos, academias, bienestar y las historias de quienes se animaron a bailar.
          </p>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mt-8 mb-10">
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Link
                href="/blog"
                className={`text-[13px] font-semibold px-3.5 py-1.5 rounded-full border shadow-sm transition-colors ${
                  !category ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white border-neutral-200 text-neutral-600 hover:border-primary hover:text-primary'
                }`}
              >
                Todas
              </Link>
              {categories.map(c => (
                <Link
                  key={c}
                  href={`/blog?categoria=${encodeURIComponent(c)}`}
                  className={`text-[13px] font-semibold px-3.5 py-1.5 rounded-full border shadow-sm transition-colors ${
                    category === c ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white border-neutral-200 text-neutral-600 hover:border-primary hover:text-primary'
                  }`}
                >
                  {c}
                </Link>
              ))}
            </div>
          )}
          <a
            href="/blog/rss.xml"
            className="flex items-center gap-1.5 text-[12.5px] font-semibold text-neutral-400 hover:text-primary transition-colors shrink-0"
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
            {/* Destacado — el más reciente, como card partida en dos
                (foto | texto) en vez de texto sobre la propia foto: el
                título siempre queda sobre fondo blanco, legible pase lo
                que pase con la foto, y la card usa el mismo lenguaje
                (borde, radius, tags) que el resto de la grilla en vez de
                un tratamiento "portada de revista" aparte. */}
            <Link
              href={`/blog/${featured.slug}`}
              className="group grid sm:grid-cols-2 rounded-lg border border-neutral-200 overflow-hidden mb-14 transition-[box-shadow,border-color] duration-150 ease-out hover:border-primary/30 hover:shadow-[0_12px_28px_rgba(17,17,17,0.08)]"
            >
              <div className="relative aspect-[16/10] sm:aspect-auto bg-neutral-100 overflow-hidden">
                {featured.coverImage ? (
                  <SmartImage
                    src={featured.coverImage}
                    alt={featured.title}
                    fill
                    sizes="(min-width: 640px) 600px, 100vw"
                    priority
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                    style={{ objectPosition: featured.coverImagePosition }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-bg to-neutral-100" />
                )}
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="badge-black text-[11px]">Destacado</span>
                  {featured.category && <span className="badge-purple-soft text-[11px]">{featured.category}</span>}
                </div>
                <h2 className="text-[22px] sm:text-[28px] font-black text-neutral-900 leading-[1.15] tracking-tight mb-3 group-hover:text-primary transition-colors">
                  {featured.title}
                </h2>
                {featured.excerpt && (
                  <p className="text-[14.5px] text-neutral-600 leading-relaxed line-clamp-3 mb-5">
                    {featured.excerpt}
                  </p>
                )}
                {/* flex-wrap + whitespace-nowrap por elemento (no en toda la
                    fila): sin esto, en pantallas angostas la fecha larga
                    ("18 de setiembre de 2026 · 12:57 a. m.") se partía a la
                    mitad de la palabra dentro de su propio <span> mientras
                    "2 min" y "Leer artículo" quedaban centrados verticalmente
                    al lado — la fila entera se veía descuadrada. Ahora cada
                    elemento se mantiene en una sola línea y, si no entran
                    todos, la fila entera salta de línea antes de partir texto. */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-neutral-500 mt-auto">
                  <span className="whitespace-nowrap">{displayDate(featured)}</span>
                  <span className="flex items-center gap-1 whitespace-nowrap"><Clock className="w-3 h-3" /> {estimateReadingTime(featured.content)} min</span>
                  {/* Acción en morado (no negro) — el color de marca marca
                      qué es clickeable en la card, en vez de una card entera
                      teñida. */}
                  <span className="flex items-center gap-1.5 text-primary font-bold whitespace-nowrap group-hover:gap-2.5 transition-[gap]">
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
                    className="group flex flex-col rounded-lg border border-neutral-200 overflow-hidden transition-[box-shadow,border-color,transform] duration-150 ease-out hover:border-primary/30 hover:shadow-[0_12px_28px_rgba(17,17,17,0.08)] hover:-translate-y-0.5"
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
                      <span className="absolute top-3 right-3 badge-black text-[11px] gap-1">
                        <Clock className="w-3 h-3" /> {estimateReadingTime(post.content)} min
                      </span>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      {post.category && (
                        <span className="badge-purple-soft text-[11px] self-start mb-2.5">{post.category}</span>
                      )}
                      {/* Título vira a morado en hover — la señal de "esto es
                          un link" es de marca, no una card entera teñida. */}
                      <h2 className="text-[17px] font-bold text-neutral-900 group-hover:text-primary leading-snug mb-2 transition-colors">{post.title}</h2>
                      {post.excerpt && (
                        <p className="text-[13.5px] text-neutral-600 leading-relaxed line-clamp-3 mb-3">{post.excerpt}</p>
                      )}
                      <p className="text-[12px] text-neutral-400 mt-auto">{displayDate(post)}</p>
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
