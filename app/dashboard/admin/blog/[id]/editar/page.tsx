import { notFound } from 'next/navigation';
import { fetchPostById } from '@/lib/blog/queries';
import BlogPostForm from '../../BlogPostForm';

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await fetchPostById(id);
  if (!post) notFound();
  return <BlogPostForm post={post} />;
}
