'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import {
  Bold, Italic, Heading2, Heading3, Quote, List, ListOrdered,
  Link2, ImagePlus, Minus, Undo2, Redo2, Loader2,
} from 'lucide-react';
import { uploadBlogImage } from '@/lib/blog/imageActions';

function ToolbarButton({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        active ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-200/70'
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-neutral-200 mx-1 shrink-0" />;
}

// Editor tipo Medium para redactar posts — reemplaza el textarea de Markdown
// crudo + vista previa aparte que tenía antes el panel de admin. Sigue
// guardando (y cargando) Markdown puro en `content`: extractHeadings(),
// extractFaqs() y estimateReadingTime() en lib/blog/helpers.ts, además del
// render público (ReactMarkdown en BlogPostClient), ya asumen ese formato —
// cambiarlo hubiera significado reescribir todo ese pipeline. La extensión
// Markdown de tiptap-markdown resuelve la conversión en los dos sentidos:
// el editor trabaja en rich text, pero lo que sale por getMarkdown() es el
// mismo Markdown de siempre.
export default function RichTextEditor({
  content, onChange,
}: {
  content: string;
  onChange: (markdown: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // El content inicial solo se usa para crear el editor (deps=[] más abajo,
  // ver comentario junto a useEditor) — after eso, el editor es la fuente de
  // verdad y onChange empuja los cambios hacia arriba, nunca al revés. Un
  // ref evita que el efecto de creación dependa de la identidad de onChange.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
          link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer nofollow' } },
        }),
        ImageExtension.configure({ HTMLAttributes: { class: 'rounded-xl' } }),
        Placeholder.configure({ placeholder: 'Cuenta tu historia. Empieza a escribir…' }),
        Markdown.configure({ html: false }),
      ],
      content,
      onUpdate: ({ editor }) => onChangeRef.current(editor.storage.markdown.getMarkdown()),
      editorProps: {
        attributes: { class: 'blog-content focus:outline-none min-h-[420px]' },
      },
    },
    // Deps vacío a propósito: el editor se crea una sola vez con el content
    // inicial del post. Recrearlo en cada render de BlogPostForm perdería
    // el cursor y el historial de deshacer.
    []
  );

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL del link', previousUrl ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editor) return;
    setUploading(true);
    const fd = new FormData();
    fd.set('file', file);
    const res = await uploadBlogImage(fd);
    setUploading(false);
    if (res.url) editor.chain().focus().setImage({ src: res.url, alt: '' }).run();
  }

  if (!editor) {
    return <div className="border border-neutral-200 rounded-lg h-[460px] bg-neutral-50 animate-pulse" />;
  }

  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden focus-within:border-neutral-900 transition-colors">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-neutral-100 bg-neutral-50">
        <ToolbarButton title="Negrita" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Cursiva" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton title="Subtítulo" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Sub-subtítulo" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton title="Lista" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Lista numerada" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Cita" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton title="Link" active={editor.isActive('link')} onClick={setLink}>
          <Link2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Insertar imagen" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
        </ToolbarButton>
        <ToolbarButton title="Separador" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="w-4 h-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton title="Deshacer" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Rehacer" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="w-4 h-4" />
        </ToolbarButton>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageFile} />
      </div>

      {/* Menú flotante al seleccionar texto — la interacción "de firma" de
          un editor tipo Medium: formatear sin ir a buscar un botón fijo. */}
      <BubbleMenu editor={editor} className="flex items-center gap-0.5 p-1 rounded-lg bg-neutral-900 shadow-lg">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`w-7 h-7 rounded flex items-center justify-center text-white transition-colors ${editor.isActive('bold') ? 'bg-white/20' : 'hover:bg-white/10'}`}
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`w-7 h-7 rounded flex items-center justify-center text-white transition-colors ${editor.isActive('italic') ? 'bg-white/20' : 'hover:bg-white/10'}`}
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`w-7 h-7 rounded flex items-center justify-center text-white transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-white/20' : 'hover:bg-white/10'}`}
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`w-7 h-7 rounded flex items-center justify-center text-white transition-colors ${editor.isActive('blockquote') ? 'bg-white/20' : 'hover:bg-white/10'}`}
        >
          <Quote className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={setLink}
          className={`w-7 h-7 rounded flex items-center justify-center text-white transition-colors ${editor.isActive('link') ? 'bg-white/20' : 'hover:bg-white/10'}`}
        >
          <Link2 className="w-3.5 h-3.5" />
        </button>
      </BubbleMenu>

      <div className="px-5 sm:px-8 py-6 max-h-[560px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
