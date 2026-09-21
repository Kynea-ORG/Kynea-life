import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchPostBySlug, fetchPostBySlugAny, fetchRelatedPosts } from '@/lib/blog/queries';
import { extractHeadings, extractFaqs, estimateReadingTime, publishedDateIso, BLOG_FALLBACK_IMAGE } from '@/lib/blog/helpers';
import { SITE_URL } from '@/lib/constants';
import { truncateForMeta } from '@/lib/utils';
import BlogPostClient from './BlogPostClient';

type PageParams = { slug: string };
type PageSearchParams = Record<string, string | string[] | undefined>;

// Vista previa de borrador: /blog/mi-post?preview=1 — fetchPostBySlugAny()
// se apoya en RLS (no en un chequeo propio de is_admin) para que un
// no-admin reciba exactamente lo mismo que si el post no existiera. Sin el
// flag, un post en borrador sigue dando 404 como siempre.
async function resolvePost(slug: string, searchParams: PageSearchParams) {
  const post = await fetchPostBySlug(slug);
  if (post) return post;
  if (searchParams.preview === '1') return fetchPostBySlugAny(slug);
  return null;
}

export async function generateMetadata({
  params, searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await resolvePost(slug, await searchParams);
  if (!post) return { title: 'Post no encontrado — Kynea' };

  const title = post.metaTitle || `${post.title} — Kynea`;
  const description = post.metaDescription || (post.excerpt ? truncateForMeta(post.excerpt) : undefined);
  const canonical = `${SITE_URL}/blog/${post.slug}`;
  const imageUrl = post.coverImage
    ? (post.coverImage.startsWith('http') ? post.coverImage : `${SITE_URL}${post.coverImage}`)
    : undefined;
  const ogImage = imageUrl || BLOG_FALLBACK_IMAGE;

  return {
    title,
    description,
    alternates: { canonical },
    // Un borrador visto en modo vista previa nunca debe indexarse — a
    // diferencia del post publicado normal, que no trae este campo.
    ...(post.status !== 'published' && { robots: { index: false, follow: false } }),
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Kynea',
      locale: 'es_PE',
      type: 'article',
      publishedTime: publishedDateIso(post),
      modifiedTime: post.updatedAt,
      section: post.category,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function BlogPostPage({
  params, searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const { slug } = await params;
  const post = await resolvePost(slug, await searchParams);
  if (!post) notFound();

  const relatedPosts = await fetchRelatedPosts(post);
  const headings = extractHeadings(post.content);
  const faqs = extractFaqs(post.content);
  const wordCount = post.content.trim().split(/\s+/).filter(Boolean).length;

  const canonical = `${SITE_URL}/blog/${post.slug}`;
  // Mismo criterio de normalización que generateMetadata() más arriba —
  // sin esto, un coverImage guardado como ruta relativa quedaba roto acá
  // y si no hay portada, Google Search Console emite advertencias para Article.
  const jsonLdImage = post.coverImage
    ? (post.coverImage.startsWith('http') ? post.coverImage : `${SITE_URL}${post.coverImage}`)
    : BLOG_FALLBACK_IMAGE;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || undefined,
    image: jsonLdImage,
    datePublished: publishedDateIso(post),
    dateModified: post.updatedAt,
    inLanguage: 'es-PE',
    articleSection: post.category || undefined,
    wordCount,
    timeRequired: `PT${estimateReadingTime(post.content)}M`,
    author: { '@type': 'Organization', name: 'Kynea', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'Kynea', url: SITE_URL, logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: canonical },
    ],
  };
  const faqJsonLd = faqs && {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}
      <BlogPostClient post={post} relatedPosts={relatedPosts} headings={headings} />
    </>
  );
}
