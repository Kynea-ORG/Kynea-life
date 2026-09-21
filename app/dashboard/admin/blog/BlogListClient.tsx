'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Eye, EyeOff, Trash2, Plus } from 'lucide-react';
import type { BlogPost } from '@/lib/blog/types';
import { deletePost, setPostStatus } from '@/lib/blog/actions';
import ErrorBanner from '@/components/ErrorBanner';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BlogListClient({ posts: initialPosts }: { posts: BlogPost[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleToggleStatus(post: BlogPost) {
    const nextStatus = post.status === 'published' ? 'draft' : 'published';
    setProcessingId(post.id);
    setError('');
    try {
      await setPostStatus(post.id, nextStatus);
      setPosts(ps => ps.map(p => (p.id === post.id ? { ...p, status: nextStatus } : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el estado del post.');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDelete(post: BlogPost) {
    setProcessingId(post.id);
    setError('');
    try {
      await deletePost(post.id);
      setPosts(ps => ps.filter(p => p.id !== post.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el post.');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-neutral-900">Blog</h1>
          <p className="text-neutral-600 text-sm mt-1">{posts.length} post{posts.length !== 1 ? 's' : ''} en total</p>
        </div>
        <Link
          href="/dashboard/admin/blog/nuevo"
          className="flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-btn transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo post
        </Link>
      </div>

      {error && <ErrorBanner className="mb-4">{error}</ErrorBanner>}

      {posts.length === 0 ? (
        <div className="text-center py-20">
          <h3 className="text-lg font-bold text-neutral-900 mb-2">Todavía no hay posts</h3>
          <p className="text-neutral-600 text-sm">Creá el primero para empezar a construir el blog.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-900 overflow-hidden">
          <div className="divide-y divide-neutral-50">
            {posts.map(post => {
              const processing = processingId === post.id;
              return (
                <div key={post.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-neutral-900 text-sm truncate">{post.title}</p>
                      <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        post.status === 'published' ? 'bg-green-bg text-green-dark' : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        {post.status === 'published' ? 'Publicado' : 'Borrador'}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {post.category ? `${post.category} · ` : ''}
                      Creado {formatDate(post.createdAt)}
                      {post.publishedAt && ` · Publicado ${formatDate(post.publishedAt)}`}
                      {/* Solo interno (acá y en el dashboard) — nunca se muestra en
                          el post público, mismo criterio que views_count de
                          clases/perfiles: un número bajo publicado puede jugar en
                          contra de un post recién salido en vez de darle crédito. */}
                      {post.status === 'published' && ` · ${post.viewsCount} vista${post.viewsCount === 1 ? '' : 's'}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/dashboard/admin/blog/${post.id}/editar`}
                      className="text-xs font-semibold px-3 py-2 border border-neutral-900 text-neutral-700 hover:bg-neutral-50 rounded-btn transition-colors"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => handleToggleStatus(post)}
                      disabled={processing}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 border border-neutral-900 text-neutral-700 hover:bg-neutral-50 rounded-btn transition-colors disabled:opacity-50"
                    >
                      {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : post.status === 'published' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {post.status === 'published' ? 'Despublicar' : 'Publicar'}
                    </button>
                    <button
                      onClick={() => handleDelete(post)}
                      disabled={processing}
                      aria-label="Eliminar"
                      className="flex items-center justify-center w-8 h-8 border border-neutral-200 text-neutral-500 hover:border-red hover:text-red rounded-btn transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
