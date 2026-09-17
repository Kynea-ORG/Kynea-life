import { fetchAllPostsForAdmin } from '@/lib/blog/queries';
import BlogListClient from './BlogListClient';

export default async function AdminBlogPage() {
  const posts = await fetchAllPostsForAdmin();
  return <BlogListClient posts={posts} />;
}
