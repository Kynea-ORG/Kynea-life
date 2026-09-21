'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ImagePlus, Clock, Star, ChevronDown, Check, Plus, X, ArrowLeft } from 'lucide-react';
import type { BlogPost, BlogPostFormPayload, BlogAccentColor, BlogActionResult } from '@/lib/blog/types';
import { createPost, updatePost } from '@/lib/blog/actions';
import { uploadBlogImage } from '@/lib/blog/imageActions';
import { BLOG_ACCENTS, getBlogAccent, estimateReadingTime } from '@/lib/blog/helpers';
import ErrorBanner from '@/components/ErrorBanner';
import RichTextEditor from './RichTextEditor';

const inputClass = 'w-full text-[14px] px-3.5 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900 transition-colors';
const labelClass = 'block text-[13px] font-semibold text-neutral-700 mb-1.5';

// El título (y la bajada) son <textarea> que crecen con el contenido, no
// <input> de una sola línea — antes un texto largo quedaba scrolleado hacia
// el costado y nunca se veía completo mientras se escribía, muy distinto
// del h1/dek reales (que hacen wrap a varias líneas).
function autoResize(el: HTMLTextAreaElement) {
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
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

// Picker de categoría — reemplaza al viejo <input list="..."> nativo, que
// se veía igual que el badge de solo-lectura del artículo publicado (sin
// ninguna pista de que era editable) y dependía del <datalist> del navegador
// para sugerencias, que es angosto, con tipografía distinta al resto de la
// UI y a veces ni aparece hasta escribir una letra. Acá el botón abre un
// menú explícito: categorías existentes para elegir con un clic, o escribir
// para crear una nueva — sin adivinar si "Guías" ya existía como "guia".
function CategoryPicker({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open]);

  const normalizedQuery = query.trim();
  const filtered = options.filter(c => c.toLowerCase().includes(normalizedQuery.toLowerCase()));
  const canCreate = normalizedQuery.length > 0 && !options.some(c => c.toLowerCase() === normalizedQuery.toLowerCase());

  function select(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(v => { if (!v) setQuery(''); return !v; })}
        className={`badge-purple-soft text-[11px] inline-flex items-center gap-1 transition-shadow ${open ? 'ring-2 ring-primary/40' : ''}`}
      >
        {value || (
          <span className="inline-flex items-center gap-1">
            <Plus className="w-3 h-3" />
            Categoría
          </span>
        )}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute z-20 top-full left-0 mt-1.5 w-64 bg-white rounded-xl border border-neutral-200 shadow-lg overflow-hidden">
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar o crear categoría…"
            className="w-full px-3 py-2.5 text-[13px] border-b border-neutral-100 outline-none placeholder:text-neutral-400"
            onKeyDown={e => {
              if (e.key === 'Enter' && canCreate) { e.preventDefault(); select(normalizedQuery); }
              if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
            }}
          />
          <div className="max-h-52 overflow-y-auto py-1">
            {value && (
              <button
                type="button"
                onClick={() => select('')}
                className="w-full flex items-center gap-1.5 text-left px-3 py-2 text-[13px] text-neutral-400 hover:bg-neutral-50"
              >
                <X className="w-3.5 h-3.5" />
                Quitar categoría
              </button>
            )}
            {filtered.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => select(c)}
                className={`w-full text-left px-3 py-2 text-[13px] hover:bg-neutral-50 flex items-center justify-between ${c === value ? 'font-semibold text-primary' : 'text-neutral-700'}`}
              >
                {c}
                {c === value && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            ))}
            {filtered.length === 0 && !canCreate && (
              <p className="px-3 py-2 text-[13px] text-neutral-400">
                {options.length === 0 ? 'Todavía no hay categorías creadas.' : 'Sin resultados.'}
              </p>
            )}
            {canCreate && (
              <button
                type="button"
                onClick={() => select(normalizedQuery)}
                className="w-full text-left px-3 py-2 text-[13px] text-primary font-semibold hover:bg-primary-bg flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                Crear “{normalizedQuery}”
              </button>
            )}
          </div>
        </div>
      )}
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

export default function BlogPostForm({ post, existingCategories = [] }: { post?: BlogPost; existingCategories?: string[] }) {
  const router = useRouter();
  const [postId, setPostId] = useState(post?.id);
  const isEdit = Boolean(post || postId);
  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [content, setContent] = useState(post?.content ?? '');
  const [category, setCategory] = useState(post?.category ?? '');
  const [accentColor, setAccentColor] = useState<BlogAccentColor | ''>(post?.accentColor ?? '');
  const [isFeatured, setIsFeatured] = useState(post?.isFeatured ?? false);
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? '');
  const [metaTitle, setMetaTitle] = useState(post?.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = useState(post?.metaDescription ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const excerptRef = useRef<HTMLTextAreaElement>(null);

  // Estado de persistencia y referencias mutables para evitar cierres obsoletos
  // (stale closures) en callbacks asíncronos y timers de autosave.
  const [savedSlug, setSavedSlug] = useState(post?.slug ?? '');
  const [lastSavedStatus, setLastSavedStatus] = useState<'draft' | 'published'>(post?.status ?? 'draft');
  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const lastSavedStatusRef = useRef<'draft' | 'published'>(post?.status ?? 'draft');
  const skipNextAutosave = useRef(true); // no autoguardar solo por haber cargado la página

  // Limpiar temporizadores pendientes al desmontar el componente
  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  // Muestra "Guardado" de forma temporal (3s) y retorna limpiamente a 'idle'
  function triggerSavedIndicator() {
    if (savedTimer.current) clearTimeout(savedTimer.current);
    setAutosaveState('saved');
    savedTimer.current = setTimeout(() => {
      setAutosaveState('idle');
    }, 3000);
  }

  // Ajusta la altura de título y bajada al contenido ya cargado al entrar a
  // editar un post existente — sin esto, un texto largo aparece cortado
  // hasta la primera tecla que se presiona.
  useEffect(() => {
    if (titleRef.current) autoResize(titleRef.current);
    if (excerptRef.current) autoResize(excerptRef.current);
  }, []);

  const accent = getBlogAccent(accentColor);
  const avatarClass = accent
    ? (accent.text === 'text-white' ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-white')
    : 'bg-primary text-white';

  // Compartido entre el guardado manual (botones) y el autosave — nunca
  // cambia el status de un post existente por su cuenta: el autosave
  // siempre reenvía lastSavedStatusRef.current, evitando revertir estados
  // por cierres obsoletos.
  async function persist(status: 'draft' | 'published'): Promise<BlogActionResult> {
    const payload: BlogPostFormPayload = {
      slug, title, excerpt, content, coverImage, category, accentColor, isFeatured, status,
      metaTitle, metaDescription,
    };
    const result = postId ? await updatePost(postId, payload) : await createPost(payload);
    if (result.ok) {
      if (result.id) {
        setPostId(result.id);
        // Si estábamos en /nuevo, sincronizamos la URL a /[id]/editar sin
        // recargar para que un refresh (F5) no pierda datos ni cree duplicados
        if (!post && typeof window !== 'undefined') {
          window.history.replaceState(null, '', `/dashboard/admin/blog/${result.id}/editar`);
        }
      }
      if (result.slug) {
        setSavedSlug(result.slug);
        // Si el campo slug estaba vacío, lo rellenamos con el slug autogenerado
        // para que futuros guardados no envíen null y regeneren el slug sin querer.
        setSlug(prev => prev.trim() ? prev : result.slug!);
      }
      setLastSavedStatus(status);
      lastSavedStatusRef.current = status;
    }
    return result;
  }

  async function handleSubmit(status: 'draft' | 'published') {
    // Cancelar cualquier autosave pendiente para evitar llamadas concurrentes redundantes
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }

    // Guardar como borrador un post que ya está publicado lo oculta del
    // blog en el acto — sin este aviso, un admin que solo quería "guardar
    // el cambio que acabo de hacer" podía despublicarlo sin darse cuenta.
    if (status === 'draft' && lastSavedStatusRef.current === 'published') {
      const confirmed = window.confirm(
        'Este post está publicado. Pasarlo a borrador lo va a ocultar del blog — dejará de verse para los visitantes hasta que lo vuelvas a publicar.\n\n¿Continuar?'
      );
      if (!confirmed) return;
    }

    setSaving(true);
    savingRef.current = true;
    setError('');

    const result = await persist(status);

    setSaving(false);
    savingRef.current = false;

    if (!result.ok) {
      setError(result.error ?? 'No se pudo guardar el post.');
      return;
    }

    // Publicar por primera vez sí cierra el editor llevando a la lista.
    // Guardar borrador, actualizar post ya publicado o pasarlo a borrador se queda en la pantalla.
    if (status === 'published' && lastSavedStatusRef.current === 'draft') {
      router.push('/dashboard/admin/blog');
    } else {
      triggerSavedIndicator();
    }
  }

  // Autosave — guarda como borrador (o republica en el mismo status que ya
  // tenía) 2.5s después del último cambio, sin bloquear la escritura. No
  // corre en el primer render (nada cambió todavía) ni si falta título
  // (createPost/updatePost lo rechazan igual) ni mientras un guardado
  // manual ya está en curso.
  useEffect(() => {
    if (skipNextAutosave.current) { skipNextAutosave.current = false; return; }
    if (!title.trim()) return;

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      if (savingRef.current) return;
      setAutosaveState('saving');
      const result = await persist(lastSavedStatusRef.current);
      if (result.ok) {
        triggerSavedIndicator();
      } else {
        setAutosaveState('error');
      }
    }, 2500);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, slug, excerpt, content, category, accentColor, isFeatured, coverImage, metaTitle, metaDescription]);

  return (
    <div className="min-h-screen bg-white">
      {/* Barra de acciones fija arriba — Guardar/Publicar siempre a mano
          mientras se escribe, en vez de tener que bajar hasta el final de
          un formulario largo cada vez (referencia: la barra de "Publish"
          de Medium, siempre visible en la parte superior). */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 lg:px-10 py-3.5 border-b border-neutral-100 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/admin/blog"
            className="flex items-center justify-center w-7 h-7 -ml-1 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            title="Volver a la lista de posts"
            aria-label="Volver a la lista de posts"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-[12px] font-bold uppercase tracking-widest text-neutral-400">
            {isEdit ? 'Editar post' : 'Nuevo post'}
          </span>
          {/* Refleja tanto el autosave como guardado manual con indicación no estática */}
          {autosaveState !== 'idle' && (
            <span className="text-[12px] text-neutral-400 flex items-center gap-1">
              {autosaveState === 'saving' && <><Loader2 className="w-3 h-3 animate-spin" /> Guardando…</>}
              {autosaveState === 'saved' && 'Guardado'}
              {autosaveState === 'error' && <span className="text-red">No se pudo autoguardar</span>}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Solo tiene sentido una vez que el post existe (tiene id) —
              muestra la última versión guardada, no lo que se está tipeando
              ahora mismo sin guardar todavía. */}
          {postId && savedSlug && (
            <a
              href={`/blog/${savedSlug}?preview=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold px-4 py-2 text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Vista previa
            </a>
          )}
          {lastSavedStatus === 'published' ? (
            <>
              <button
                type="button"
                onClick={() => handleSubmit('draft')}
                disabled={saving}
                className="text-sm font-semibold px-4 py-2 border border-neutral-300 text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 rounded-btn transition-colors disabled:opacity-50"
              >
                Pasar a borrador
              </button>
              <button
                type="button"
                onClick={() => handleSubmit('published')}
                disabled={saving}
                className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-btn transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar cambios
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleSubmit('draft')}
                disabled={saving}
                className="text-sm font-semibold px-4 py-2 border border-neutral-900 text-neutral-700 hover:bg-neutral-50 rounded-btn transition-colors disabled:opacity-50"
              >
                Guardar borrador
              </button>
              <button
                type="button"
                onClick={() => handleSubmit('published')}
                disabled={saving}
                className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-btn transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Publicar
              </button>
            </>
          )}
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
      <div className={accent ? accent.bg : undefined}>
        <div className="max-w-[1080px] mx-auto px-6 py-10 sm:py-12">
          <div className="grid gap-8 sm:grid-cols-2 sm:gap-12 sm:items-center">
            <CoverImageSquare url={coverImage} onUploaded={setCoverImage} />

            <div>
              <div className="mb-4">
                <CategoryPicker value={category} onChange={setCategory} options={existingCategories} />
              </div>
              <textarea
                ref={titleRef}
                value={title}
                onChange={e => { setTitle(e.target.value); autoResize(e.target); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); excerptRef.current?.focus(); } }}
                placeholder="Título de tu historia…"
                rows={1}
                className={`w-full text-[28px] sm:text-[36px] font-black tracking-tight leading-[1.12] mb-4 border-0 outline-none bg-transparent placeholder:text-neutral-300 resize-none overflow-hidden ${accent ? accent.text : 'text-neutral-900'}`}
              />
              <div className={`flex items-start gap-3 mb-5 ${accent ? accent.muted : 'text-neutral-600'}`}>
                <span className={`font-black text-[22px] sm:text-[24px] leading-[0.9] shrink-0 ${accent ? accent.text : 'text-primary'}`} aria-hidden="true">/</span>
                <textarea
                  ref={excerptRef}
                  value={excerpt}
                  onChange={e => { setExcerpt(e.target.value); autoResize(e.target); }}
                  placeholder="Escribe una bajada breve — aparece en el listado y como resumen…"
                  rows={1}
                  className="flex-1 text-[16px] sm:text-[17px] leading-snug border-0 outline-none resize-none overflow-hidden bg-transparent placeholder:text-neutral-400"
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

      {/* El selector de color y el destacado viven pegados a la cabecera
          que afectan — cambiarlos y ver el efecto arriba (o en el listado)
          tienen que sentirse como una sola acción, no un campo de
          formulario en otra parte de la pantalla. */}
      <div className="border-b border-neutral-100 bg-white px-6 py-4">
        <div className="max-w-[1080px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <AccentColorPicker value={accentColor} onChange={setAccentColor} />
          <button
            type="button"
            onClick={() => setIsFeatured(v => !v)}
            className={`flex items-center gap-2 text-[12.5px] font-semibold px-3.5 py-2 rounded-full border-2 transition-colors ${isFeatured ? 'bg-yellow border-yellow text-neutral-900' : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400'}`}
            title="Un post destacado se muestra primero en el home del blog, antes que el más reciente."
          >
            <Star className={`w-3.5 h-3.5 ${isFeatured ? 'fill-neutral-900' : ''}`} />
            {isFeatured ? 'Destacado' : 'Destacar en el home'}
          </button>
        </div>
      </div>

      <div className="max-w-[760px] mx-auto px-6 pt-10">
        <RichTextEditor content={content} onChange={setContent} />
      </div>

      {/* SEO — ya no comparte fila con el banner de CTA (ahora es un bloque
          insertable dentro del propio contenido, ver el botón "+" en el
          editor), así que puede respirar en un ancho completo en vez de
          quedar apretado en media columna. */}
      <div className="max-w-[1080px] mx-auto px-6 pb-16 pt-8">
        <div className="pt-8 border-t border-neutral-100">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-neutral-400 mb-6">SEO (opcional)</h2>
          <div className="space-y-5 max-w-[720px]">
            <div>
              <label className={labelClass}>URL del post</label>
              <div className="flex items-center rounded-lg border border-neutral-200 focus-within:border-neutral-900 transition-colors overflow-hidden">
                <span className="pl-3.5 text-[14px] text-neutral-400 select-none">/blog/</span>
                <input
                  className="flex-1 text-[14px] py-2.5 pr-3.5 border-0 outline-none"
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  placeholder={isEdit ? '(no cambiar)' : 'se genera del título si lo dejas vacío'}
                />
              </div>
              {/* El slug ya asignado deja de tocarse solo cuando cambia el
                  título (antes cualquier retoque al título rompía en
                  silencio los links ya compartidos) — vaciar este campo a
                  propósito es la única forma de pedir que se regenere. */}
              <p className="text-[11.5px] text-neutral-400 mt-1.5">
                {isEdit ? 'Cambiarla mueve la URL del post — cualquier link ya compartido con la anterior deja de funcionar. Vacío = regenerar del título actual.' : 'Si lo dejas vacío, se genera automáticamente del título.'}
              </p>
            </div>
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
  );
}
