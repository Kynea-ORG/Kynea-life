import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchPostBySlug, fetchRelatedPosts } from '@/lib/blog/queries';
import { extractHeadings, extractFaqs, estimateReadingTime } from '@/lib/blog/helpers';
import { SITE_URL } from '@/lib/constants';
import { truncateForMeta } from '@/lib/utils';
import BlogPostClient from './BlogPostClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPostBySlug(slug);
  if (!post) return { title: 'Post no encontrado — Kynea' };

  const title = post.metaTitle || `${post.title} — Kynea`;
  const description = post.metaDescription || (post.excerpt ? truncateForMeta(post.excerpt) : undefined);
  const canonical = `${SITE_URL}/blog/${post.slug}`;
  const imageUrl = post.coverImage
    ? (post.coverImage.startsWith('http') ? post.coverImage : `${SITE_URL}${post.coverImage}`)
    : undefined;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      section: post.category,
      ...(imageUrl && { images: [{ url: imageUrl }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchPostBySlug(slug);
  if (!post) notFound();

  const relatedPosts = await fetchRelatedPosts(post);
  const headings = extractHeadings(post.content);
  const faqs = extractFaqs(post.content);
  const wordCount = post.content.trim().split(/\s+/).filter(Boolean).length;

  const canonical = `${SITE_URL}/blog/${post.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || undefined,
    image: post.coverImage || undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    inLanguage: 'es-PE',
    articleSection: post.category || undefined,
    wordCount,
    timeRequired: `PT${estimateReadingTime(post.content)}M`,
    author: { '@type': 'Organization', name: 'Kynea', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'Kynea', url: SITE_URL },
    mainEntityOfPage: canonical,
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
