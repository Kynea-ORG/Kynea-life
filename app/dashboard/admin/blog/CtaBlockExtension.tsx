'use client';
import { useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { ArrowRight, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { uploadBlogImage } from '@/lib/blog/imageActions';

export type CtaBlockStyle = 'grande' | 'compacto';

interface CtaAttrs {
  label: string;
  href: string;
  image: string;
  style: CtaBlockStyle;
}

// Reemplaza el banner de CTA fijo que antes vivía como campo aparte del
// post (siempre al final, uno solo por artículo) — acá es un bloque más
// del contenido, insertable donde el cursor esté parado y tantas veces
// como haga falta. Se guarda en el Markdown como un fence ```cta con la
// config en JSON — no HTML embebido — así el post sigue siendo Markdown
// portable y legible fuera de esta app.
function CtaBlockView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const attrs = node.attrs as CtaAttrs;
  const [uploading, setUploading] = useState(false);

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.set('file', file);
    const res = await uploadBlogImage(fd);
    setUploading(false);
    if (res.url) updateAttributes({ image: res.url });
  }

  return (
    <NodeViewWrapper
      className={`my-6 rounded-lg border-2 border-dashed p-4 transition-colors ${selected ? 'border-primary bg-primary-bg/30' : 'border-neutral-200'}`}
      data-drag-handle
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Bloque de CTA</span>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-neutral-200 overflow-hidden">
            {(['grande', 'compacto'] as const).map(styleOption => (
              <button
                key={styleOption}
                type="button"
                onClick={() => updateAttributes({ style: styleOption })}
                className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${attrs.style === styleOption ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}
              >
                {styleOption === 'grande' ? 'Grande' : 'Compacto'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={deleteNode}
            title="Quitar bloque"
            aria-label="Quitar bloque"
            className="flex items-center justify-center w-7 h-7 rounded-md text-neutral-400 hover:bg-red-bg hover:text-red transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <input
          value={attrs.label}
          onChange={e => updateAttributes({ label: e.target.value })}
          placeholder="Texto del botón — ej. Ver clases de Salsa"
          className="text-[13px] px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900 transition-colors"
        />
        <input
          value={attrs.href}
          onChange={e => updateAttributes({ href: e.target.value })}
          placeholder="Enlace — ej. /clases?style=Salsa"
          className="text-[13px] px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900 transition-colors"
        />
      </div>

      {attrs.style === 'grande' && (
        <div className="mt-3">
          {attrs.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={attrs.image} alt="" className="w-full h-24 object-cover rounded-lg border border-neutral-200" />
          ) : null}
          <label className="inline-flex items-center gap-1.5 mt-2 text-[12px] font-semibold text-neutral-600 border border-neutral-300 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-neutral-50 transition-colors">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
            {attrs.image ? 'Cambiar imagen de fondo' : 'Imagen de fondo (opcional)'}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImage} disabled={uploading} />
          </label>
        </div>
      )}

      {/* Vista previa real del estilo elegido */}
      <div className="mt-3 pointer-events-none">
        <CtaPreview attrs={attrs} />
      </div>
    </NodeViewWrapper>
  );
}

// Compartido con el render público (BlogPostClient) para que la vista
// previa en el editor sea exactamente el resultado final, no una
// aproximación — mismas clases, ambos lados.
export function CtaPreview({ attrs }: { attrs: CtaAttrs }) {
  const label = attrs.label || 'Texto del botón';
  if (attrs.style === 'compacto') {
    return (
      <div className="group inline-flex items-center gap-2 rounded-full border-2 border-neutral-900 pl-4 pr-3 py-2 text-[13px] font-bold text-neutral-900">
        {label}
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    );
  }
  return (
    <div className="relative rounded-lg overflow-hidden border border-neutral-900">
      {attrs.image ? (
        <div className="relative aspect-[21/9]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={attrs.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/0" />
          <div className="absolute inset-x-0 bottom-0 p-6 flex items-center justify-between gap-4">
            <span className="text-[18px] font-extrabold text-white tracking-tight">{label}</span>
            <ArrowRight className="w-5 h-5 text-white shrink-0" />
          </div>
        </div>
      ) : (
        <div className="bg-neutral-900 p-6 flex items-center justify-between gap-4">
          <span className="text-[18px] font-extrabold text-white tracking-tight">{label}</span>
          <ArrowRight className="w-5 h-5 text-white shrink-0" />
        </div>
      )}
    </div>
  );
}

export const CtaBlock = Node.create({
  name: 'ctaBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      label: { default: '' },
      href: { default: '' },
      image: { default: '' },
      style: { default: 'grande' },
    };
  },

  parseHTML() {
    return [{
      tag: 'div[data-type="cta-block"]',
      getAttrs: element => {
        const dom = element as HTMLElement;
        return {
          label: dom.getAttribute('data-label') || '',
          href: dom.getAttribute('data-href') || '',
          image: dom.getAttribute('data-image') || '',
          style: dom.getAttribute('data-style') === 'compacto' ? 'compacto' : 'grande',
        };
      },
    }];
  },

  renderHTML({ node }) {
    return ['div', mergeAttributes({
      'data-type': 'cta-block',
      'data-label': node.attrs.label,
      'data-href': node.attrs.href,
      'data-image': node.attrs.image,
      'data-style': node.attrs.style,
    })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CtaBlockView);
  },

  // tiptap-markdown lee este storage para saber cómo leer/escribir el nodo
  // como Markdown — ver lib/blog/queries.ts y BlogPostClient.tsx para el
  // otro lado del contrato (el ```cta que se guarda y cómo se renderiza en
  // el post público).
  addStorage() {
    return {
      markdown: {
        serialize(state: { write: (s: string) => void; text: (s: string, escape?: boolean) => void; ensureNewLine: () => void; closeBlock: (n: unknown) => void }, node: { attrs: CtaAttrs }) {
          state.write('```cta\n');
          state.text(JSON.stringify({
            label: node.attrs.label, href: node.attrs.href, image: node.attrs.image, style: node.attrs.style,
          }), false);
          state.ensureNewLine();
          state.write('```');
          state.closeBlock(node);
        },
        parse: {
          setup(markdownit: { renderer: { rules: Record<string, unknown> } }) {
            type FenceToken = { info: string; content: string };
            type FenceRenderer = (tokens: FenceToken[], idx: number, options: unknown, env: unknown, self: { renderToken: (t: FenceToken[], i: number, o: unknown) => string }) => string;
            const defaultFence = markdownit.renderer.rules.fence as FenceRenderer | undefined;
            markdownit.renderer.rules.fence = ((tokens: FenceToken[], idx: number, options: unknown, env: unknown, self: { renderToken: (t: FenceToken[], i: number, o: unknown) => string }) => {
              const token = tokens[idx];
              if (token.info.trim() === 'cta') {
                let data: Partial<CtaAttrs> = {};
                try { data = JSON.parse(token.content); } catch {
                  // Contenido corrupto/editado a mano — se renderiza como bloque vacío en vez de romper el parseo de todo el post.
                }
                const esc = (value: string) => String(value ?? '')
                  .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                return `<div data-type="cta-block" data-label="${esc(data.label ?? '')}" data-href="${esc(data.href ?? '')}" data-image="${esc(data.image ?? '')}" data-style="${esc(data.style ?? 'grande')}"></div>`;
              }
              return defaultFence ? defaultFence(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options);
            }) as FenceRenderer;
          },
        },
      },
    };
  },
});
