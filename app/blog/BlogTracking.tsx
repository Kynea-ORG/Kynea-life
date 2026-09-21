'use client';
import Link from 'next/link';
import type { ComponentProps } from 'react';
import { trackSelectPost, trackBlogCategoryFilter } from '@/lib/analytics';

// app/blog/page.tsx es un Server Component (necesita await fetchPublishedPosts
// antes de renderizar) — estos dos wrappers son los únicos pedazos que
// necesitan ser 'use client', para poder engancharle un onClick de tracking
// a un <Link> sin convertir toda la página. Mismo patrón que ClassCard.tsx
// (trackSelectItem) para las clases.
export function TrackedPostLink({
  postSlug, postTitle, category, listName, ...linkProps
}: {
  postSlug: string;
  postTitle: string;
  category?: string;
  listName: 'blog_home_featured' | 'blog_home_grid';
} & ComponentProps<typeof Link>) {
  return (
    <Link
      {...linkProps}
      onClick={() => trackSelectPost({ postSlug, postTitle, category, listName })}
    />
  );
}

export function TrackedCategoryLink({
  category, ...linkProps
}: { category: string } & ComponentProps<typeof Link>) {
  return (
    <Link
      {...linkProps}
      onClick={() => trackBlogCategoryFilter({ category })}
    />
  );
}
