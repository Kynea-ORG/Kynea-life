import { redirect } from 'next/navigation';

export default async function OldClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/clases/${id}`);
}
