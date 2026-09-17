'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { Loader2 } from 'lucide-react';
import type { BlogPost, BlogPostFormPayload } from '@/lib/blog/types';
import { createPost, updatePost } from '@/lib/blog/actions';
import { uploadBlogImage } from '@/lib/blog/imageActions';
import ErrorBanner from '@/components/ErrorBanner';

const inputClass = 'w-full text-[14px] px-3.5 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900 transition-colors';
const labelClass = 'block text-[13px] font-semibold text-neutral-700 mb-1.5';

function ImagePicker({ label, url, onUploaded }: { label: string; url: string; onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const fd = new FormData();
    fd.set('file', file);
    const res = await uploadBlogImage(fd);
    setUploading(false);
    if (res.error) { setError(res.error); return; }
    if (res.url) onUploaded(res.url);
  }

  return (
    <div>
      <label className={labelClass}>{label}</label>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-32 object-cover rounded-lg mb-2 border border-neutral-200" />
      )}
      <label className="inline-flex items-center gap-2 text-[13px] font-semibold text-neutral-700 border border-neutral-300 rounded-lg px-3.5 py-2 cursor-pointer hover:bg-neutral-50 transition-colors">
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
        {url ? 'Cambiar imagen' : 'Subir imagen'}
        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleChange} disabled={uploading} />
      </label>
      {error && <p className="text-xs text-red mt-1">{error}</p>}
    </div>
  );
}

export default function BlogPostForm({ post }: { post?: BlogPost }) {
  const router = useRouter();
  const isEdit = Boolean(post);
  const [title, setTitle] = useState(post?.title ?? '');
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [content, setContent] = useState(post?.content ?? '');
  const [category, setCategory] = useState(post?.category ?? '');
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? '');
  const [metaTitle, setMetaTitle] = useState(post?.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = useState(post?.metaDescription ?? '');
  const [ctaLabel, setCtaLabel] = useState(post?.ctaLabel ?? '');
  const [ctaHref, setCtaHref] = useState(post?.ctaHref ?? '');
  const [ctaImage, setCtaImage] = useState(post?.ctaImage ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(status: 'draft' | 'published') {
    setSaving(true);
    setError('');
    const payload: BlogPostFormPayload = {
      title, excerpt, content, coverImage, category, status,
      metaTitle, metaDescription, ctaLabel, ctaHref, ctaImage,
    };
    const result = isEdit ? await updatePost(post!.id, payload) : await createPost(payload);
    setSaving(false);
    if (!result.ok) { setError(result.error ?? 'No se pudo guardar el post.'); return; }
    router.push('/dashboard/admin/blog');
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <h1 className="text-2xl font-black text-neutral-900 mb-6">{isEdit ? 'Editar post' : 'Nuevo post'}</h1>

      {error && <ErrorBanner className="mb-4">{error}</ErrorBanner>}

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8">
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Título</label>
            <input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} placeholder="Cómo elegir tu primer estilo de baile" />
          </div>

          <div>
            <label className={labelClass}>Resumen (aparece en el listado y como descripción por defecto)</label>
            <textarea className={inputClass} rows={2} value={excerpt} onChange={e => setExcerpt(e.target.value)} />
          </div>

          <div>
            <label className={labelClass}>Categoría</label>
            <input className={inputClass} value={category} onChange={e => setCategory(e.target.value)} placeholder="Guías, Estilos, Novedades…" />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Contenido (Markdown)</label>
              <textarea
                className={`${inputClass} font-mono text-[13px]`}
                rows={18}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={'# Título de sección\n\nTexto en **negrita**, [un link](https://kynea.dance/clases?style=Salsa) y más.'}
              />
            </div>
            <div>
              <label className={labelClass}>Vista previa</label>
              <div className="blog-content border border-neutral-200 rounded-lg p-3.5 h-[402px] overflow-y-auto">
                {content ? <ReactMarkdown>{content}</ReactMarkdown> : <p className="text-neutral-400">La vista previa aparece acá.</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <ImagePicker label="Imagen de portada" url={coverImage} onUploaded={setCoverImage} />

          <div className="border-t border-neutral-100 pt-5">
            <p className="text-[13px] font-bold text-neutral-900 mb-3">Banner / CTA</p>
            <p className="text-[12px] text-neutral-500 mb-3">Un bloque destacado dentro del post que empuja al lector hacia el marketplace.</p>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Texto del botón</label>
                <input className={inputClass} value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} placeholder="Ver clases de Salsa" />
              </div>
              <div>
                <label className={labelClass}>Enlace</label>
                <input className={inputClass} value={ctaHref} onChange={e => setCtaHref(e.target.value)} placeholder="/clases?style=Salsa" />
              </div>
              <ImagePicker label="Imagen del banner (opcional)" url={ctaImage} onUploaded={setCtaImage} />
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-5">
            <p className="text-[13px] font-bold text-neutral-900 mb-3">SEO (opcional)</p>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Título para buscadores</label>
                <input className={inputClass} value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder="Si lo dejás vacío, usa el título del post" />
              </div>
              <div>
                <label className={labelClass}>Descripción para buscadores</label>
                <textarea className={inputClass} rows={2} value={metaDescription} onChange={e => setMetaDescription(e.target.value)} placeholder="Si lo dejás vacío, usa el resumen" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-8 pt-6 border-t border-neutral-100">
        <button
          onClick={() => handleSubmit('draft')}
          disabled={saving}
          className="text-sm font-semibold px-4 py-2.5 border border-neutral-900 text-neutral-700 hover:bg-neutral-50 rounded-btn transition-colors disabled:opacity-50"
        >
          Guardar borrador
        </button>
        <button
          onClick={() => handleSubmit('published')}
          disabled={saving}
          className="flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-btn transition-colors disabled:opacity-50"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Publicar
        </button>
      </div>
    </div>
  );
}
