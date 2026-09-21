import { fetchAllBlogCategories } from '@/lib/blog/queries';
import BlogPostForm from '../BlogPostForm';

export default async function NewBlogPostPage() {
  const existingCategories = await fetchAllBlogCategories();
  return <BlogPostForm existingCategories={existingCategories} />;
}
