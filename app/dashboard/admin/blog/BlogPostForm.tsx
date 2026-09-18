'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ImagePlus, Clock } from 'lucide-react';
import type { BlogPost, BlogPostFormPayload, BlogAccentColor } from '@/lib/blog/types';
import { createPost, updatePost } from '@/lib/blog/actions';
import { uploadBlogImage } from '@/lib/blog/imageActions';
import { BLOG_ACCENTS, getBlogAccent, estimateReadingTime } from '@/lib/blog/helpers';
import ErrorBanner from '@/components/ErrorBanner';
import RichTextEditor from './RichTextEditor';

const inputClass = 'w-full text-[14px] px-3.5 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900 transition-colors';
const labelClass = 'block text-[13px] font-semibold text-neutral-700 mb-1.5';

function ImagePicker({
  label, hint, url, onUploaded,
}: {
  label: string; hint: string; url: string; onUploaded: (url: string) => void;
}) {
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
      {/* Medida recomendada explícita — antes no decía nada, y la foto se
          termina viendo recortada o pixelada porque nadie sabe qué tamaño
          subir hasta ver el resultado publicado. */}
      <p className="text-[11.5px] text-neutral-400 mt-1.5">{hint}</p>
      {error && <p className="text-xs text-red mt-1">{error}</p>}
    </div>
  );
}

// Portada cuadrada — mismo recorte exacto (aspect-square, object-cover) que
// la imagen a la izquierda del header en BlogPostClient, para que lo que se
// ve acá sea literalmente cómo va a quedar el post real, no una miniatura
// aparte en una barra lateral que no se parece en nada al resultado final.
function CoverImageSquare({ url, onUploaded }: { url: string; onUploaded: (url: string) => void }) {
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
      <label className="group relative block w-full aspect-square rounded-lg overflow-hidden bg-neutral-100 border-2 border-dashed border-neutral-300 hover:border-neutral-900 cursor-pointer transition-colors">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-neutral-400">
            <ImagePlus className="w-6 h-6" />
            <span className="text-[12.5px] font-semibold">Subir portada</span>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 opacity-0 group-hover:opacity-100 transition-[background-color,opacity]">
          {uploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <span className="text-[12.5px] font-semibold text-white">{url ? 'Cambiar portada' : 'Subir portada'}</span>}
        </div>
        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleChange} disabled={uploading} />
      </label>
      <p className="text-[11.5px] text-neutral-400 mt-2">Cuadrada, mínimo 800×800px. Se usa así en la portada del artículo, y recortada a 16:10 en el listado del blog.</p>
      {error && <p className="text-xs text-red mt-1">{error}</p>}
    </div>
  );
}

// Selector del "bloque de color" de portada (referencia: The Verge) — grilla
// de swatches de la paleta curada (BLOG_ACCENTS) en vez de un <input
// type=color> libre, así nunca se guarda una combinación de contraste rota.
function AccentColorPicker({ value, onChange }: { value: BlogAccentColor | ''; onChange: (v: BlogAccentColor | '') => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-[12.5px] font-semibold text-neutral-500 shrink-0">Color de portada:</span>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange('')}
          title="Sin color"
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-neutral-400 transition-[border-color] ${value === '' ? 'border-neutral-900' : 'border-neutral-200 hover:border-neutral-400'}`}
        >
          ✕
        </button>
        {Object.values(BLOG_ACCENTS).map(accent => (
          <button
            key={accent.key}
            type="button"
            onClick={() => onChange(accent.key)}
            title={accent.label}
            aria-label={accent.label}
            className={`w-8 h-8 rounded-full border-2 transition-[border-color] ${value === accent.key ? 'border-neutral-900' : 'border-transparent hover:border-neutral-300'}`}
            style={{ backgroundColor: accent.swatch }}
          />
        ))}
      </div>
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
  const [accentColor, setAccentColor] = useState<BlogAccentColor | ''>(post?.accentColor ?? '');
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? '');
  const [metaTitle, setMetaTitle] = useState(post?.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = useState(post?.metaDescription ?? '');
  const [ctaLabel, setCtaLabel] = useState(post?.ctaLabel ?? '');
  const [ctaHref, setCtaHref] = useState(post?.ctaHref ?? '');
  const [ctaImage, setCtaImage] = useState(post?.ctaImage ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const accent = getBlogAccent(accentColor);
  const avatarClass = accent
    ? (accent.text === 'text-white' ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-white')
    : 'bg-primary text-white';

  async function handleSubmit(status: 'draft' | 'published') {
    setSaving(true);
    setError('');
    const payload: BlogPostFormPayload = {
      title, excerpt, content, coverImage, category, accentColor, status,
      metaTitle, metaDescription, ctaLabel, ctaHref, ctaImage,
    };
    const result = isEdit ? await updatePost(post!.id, payload) : await createPost(payload);
    setSaving(false);
    if (!result.ok) { setError(result.error ?? 'No se pudo guardar el post.'); return; }
    router.push('/dashboard/admin/blog');
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Barra de acciones fija arriba — Guardar/Publicar siempre a mano
          mientras se escribe, en vez de tener que bajar hasta el final de
          un formulario largo cada vez (referencia: la barra de "Publish"
          de Medium, siempre visible en la parte superior). */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 lg:px-10 py-3.5 border-b border-neutral-100 bg-white/95 backdrop-blur-sm">
        <span className="text-[12px] font-bold uppercase tracking-widest text-neutral-400">
          {isEdit ? 'Editar post' : 'Nuevo post'}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSubmit('draft')}
            disabled={saving}
            className="text-sm font-semibold px-4 py-2 border border-neutral-900 text-neutral-700 hover:bg-neutral-50 rounded-btn transition-colors disabled:opacity-50"
          >
            Guardar borrador
          </button>
          <button
            onClick={() => handleSubmit('published')}
            disabled={saving}
            className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-btn transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Publicar
          </button>
        </div>
      </div>

      {error && (
        <div className="max-w-[1080px] mx-auto px-6 pt-6">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}

      {/* Cabecera editable — espejo literal, con las mismas clases, del
          header real en BlogPostClient: mismo recorte de foto, mismo
          tamaño de título, mismo "/" en la bajada, mismo bloque de color.
          Lo que se ve acá mientras se escribe es exactamente cómo va a
          quedar publicado, no una aproximación en un formulario aparte. */}
      <div className={accent ? accent.bg : 'bg-neutral-50'}>
        <div className="max-w-[1080px] mx-auto px-6 py-10 sm:py-12">
          <div className="grid gap-8 sm:grid-cols-2 sm:gap-12 sm:items-center">
            <CoverImageSquare url={coverImage} onUploaded={setCoverImage} />

            <div>
              <input
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="+ Categoría"
                size={Math.max(category.length, 12)}
                className="badge-purple-soft text-[11px] mb-4 outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-primary/50"
              />
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Título de tu historia…"
                className={`w-full text-[28px] sm:text-[36px] font-black tracking-tight leading-[1.12] mb-4 border-0 outline-none bg-transparent placeholder:text-neutral-300 ${accent ? accent.text : 'text-neutral-900'}`}
              />
              <div className={`flex items-start gap-3 mb-5 ${accent ? accent.muted : 'text-neutral-600'}`}>
                <span className={`font-black text-[22px] sm:text-[24px] leading-[0.9] shrink-0 ${accent ? accent.text : 'text-primary'}`} aria-hidden="true">/</span>
                <textarea
                  value={excerpt}
                  onChange={e => setExcerpt(e.target.value)}
                  placeholder="Escribe una bajada breve — aparece en el listado y como resumen…"
                  rows={2}
                  className="flex-1 text-[16px] sm:text-[17px] leading-snug border-0 outline-none resize-none bg-transparent placeholder:text-neutral-400"
                />
              </div>
              <div className={`flex items-center gap-3 text-[13px] ${accent ? accent.muted : 'text-neutral-500'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarClass}`}>K</span>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={`font-semibold ${accent ? accent.text : 'text-neutral-800'}`}>Equipo Kynea</span>
                  <span>·</span>
                  <span>Hoy</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {estimateReadingTime(content)} min de lectura</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* El selector de color vive pegado a la cabecera que tiñe — cambiarlo
          y ver el efecto arriba tienen que sentirse como una sola acción,
          no un campo de formulario en otra parte de la pantalla. */}
      <div className="border-b border-neutral-100 bg-white px-6 py-4">
        <div className="max-w-[1080px] mx-auto">
          <AccentColorPicker value={accentColor} onChange={setAccentColor} />
        </div>
      </div>

      <div className="max-w-[760px] mx-auto px-6 py-10">
        <RichTextEditor content={content} onChange={setContent} />

        {/* Todo lo que no es "escribir" — CTA y SEO — vive después del
            editor en vez de compitiendo por espacio al lado, como un panel
            de "detalles de la publicación" separado de la redacción en sí. */}
        <div className="mt-12 pt-8 border-t border-neutral-100">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-neutral-400 mb-6">Detalles del post</h2>
          <div className="grid sm:grid-cols-2 gap-8">
            <div className="border border-neutral-200 rounded-lg p-4">
              <p className="text-[13px] font-bold text-neutral-900 mb-1">Banner / CTA</p>
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
                <ImagePicker
                  label="Imagen del banner (opcional)"
                  hint="Panorámica, mínimo 1600×686px (proporción 21:9) — ocupa todo el ancho del banner."
                  url={ctaImage}
                  onUploaded={setCtaImage}
                />
              </div>
            </div>

            <div className="border border-neutral-200 rounded-lg p-4">
              <p className="text-[13px] font-bold text-neutral-900 mb-3">SEO (opcional)</p>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Título para buscadores</label>
                  <input className={inputClass} value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder="Si lo dejas vacío, usa el título del post" />
                </div>
                <div>
                  <label className={labelClass}>Descripción para buscadores</label>
                  <textarea className={inputClass} rows={2} value={metaDescription} onChange={e => setMetaDescription(e.target.value)} placeholder="Si lo dejas vacío, usa el resumen" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
