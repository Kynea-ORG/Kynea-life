'use client';
import { isValidElement, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { ArrowRight, ChevronRight, Clock, Link2, Check, List, MessageCircle, Send, Mail } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SmartImage from '@/components/SmartImage';
import type { BlogPost } from '@/lib/blog/types';
import { estimateReadingTime, slugifyHeading, getBlogAccent, type Heading } from '@/lib/blog/helpers';
import { trackBlogCtaClick, trackBlogShare, trackViewPost, trackSelectPost } from '@/lib/analytics';
import { createClient } from '@/lib/supabase/client';
import { SITE_URL } from '@/lib/constants';

// Bloque de CTA insertable dentro del contenido — reemplaza al banner fijo
// de siempre-al-final que tenían los posts viejos (post.ctaLabel/ctaHref/
// ctaImage, ya no se renderiza: se veía igual en todos los artículos y
// resultaba invasivo). Se guarda en el Markdown como un fence ```cta con la
// config en JSON (ver CtaBlockExtension.tsx, que arma ese mismo fence desde
// el editor) — acá solo lo leemos y renderizamos como link real, con
// tracking de clicks.
function InlineCta({
  label, href, image, style, postSlug,
}: {
  label: string; href: string; image: string; style: string; postSlug: string;
}) {
  if (!label || !href) return null; // bloque insertado pero sin terminar de configurar — no se publica roto
  if (style === 'compacto') {
    return (
      <Link
        href={href}
        onClick={() => trackBlogCtaClick({ postSlug, ctaHref: href })}
        // no-underline: sin esto, la regla global ".blog-content a" (que
        // subraya los links normales del texto) también subrayaba este
        // botón — se veía como una línea suelta cruzando el pill.
        className="group inline-flex items-center gap-2 rounded-full border-2 border-neutral-900 pl-4 pr-3 py-2 text-[13px] font-bold text-neutral-900 no-underline hover:bg-neutral-900 hover:text-white transition-colors my-4"
      >
        {label}
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    );
  }
  return (
    <Link
      href={href}
      onClick={() => trackBlogCtaClick({ postSlug, ctaHref: href })}
      className="group relative block my-8 rounded-lg overflow-hidden border border-neutral-900 no-underline"
    >
      {image ? (
        <div className="relative aspect-[21/9]">
          <SmartImage src={image} alt="" fill sizes="760px" className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]" />
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
    </Link>
  );
}

// Fecha + hora — antes solo se mostraba la fecha, y ni eso si publishedAt
// era null. displayDate() usa createdAt (NOT NULL siempre) como fallback,
// así el artículo nunca queda sin fecha visible.
function formatDate(iso: string): string {
  const date = new Date(iso);
  const datePart = date.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
  const timePart = date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
}

function displayDate(post: { publishedAt?: string; createdAt: string }): string {
  return formatDate(post.publishedAt ?? post.createdAt);
}

// Índice ("En este artículo") — reusado tal cual en desktop (sidebar
// sticky) y mobile (<details> plegable arriba del contenido). Marca la
// sección activa con IntersectionObserver mientras el lector hace scroll,
// mismo criterio visual que un editor de texto con outline.
function TableOfContents({ headings, activeSlug }: { headings: Heading[]; activeSlug: string | null }) {
  return (
    <ul className="space-y-1">
      {headings.map(h => (
        <li key={h.slug}>
          <a
            href={`#${h.slug}`}
            className={`block text-[13.5px] leading-snug py-1 border-l-2 pl-3 transition-colors ${
              activeSlug === h.slug
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300'
            }`}
          >
            {h.text}
          </a>
        </li>
      ))}
    </ul>
  );
}

// Barra de progreso de lectura — fija bajo el header, mide el scroll sobre
// el propio <article> (no la página completa: el footer no debería seguir
// "llenando" la barra). rAF-throttled para no disparar un setState por cada
// evento de scroll.
function ReadingProgressBar({ targetRef }: { targetRef: React.RefObject<HTMLElement | null> }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;
    function update() {
      ticking = false;
      const el = targetRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = -rect.top;
      const pct = total > 0 ? Math.min(100, Math.max(0, (scrolled / total) * 100)) : 0;
      setProgress(pct);
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [targetRef]);

  return (
    <div className="fixed top-0 left-0 right-0 z-[51] h-[3px] bg-transparent pointer-events-none">
      <div className="h-full bg-primary transition-[width] duration-100 ease-out" style={{ width: `${progress}%` }} />
    </div>
  );
}

// Marcas de Facebook/X — lucide-react no trae logos de terceros (a
// diferencia de WhatsApp/Telegram/Email, que ya se resuelven con un ícono
// genérico + label), así que estos dos van como SVG inline mínimo, en
// currentColor para heredar el mismo tratamiento monocromo que el resto de
// los íconos de la fila (nunca el azul/negro de marca).
function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
    </svg>
  );
}

function XGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// Fila de compartir — antes solo tenía WhatsApp + copiar enlace. Ahora cubre
// los canales reales que un profesor/alumno de baile en LatAm usa para
// difundir contenido (Facebook e Instagram-via-WhatsApp-status son los más
// usados en la región, X y Telegram como alternativa, Email siempre
// disponible). Botones circulares solo-ícono (referencia: la fila de
// compartir de The Verge) en vez de pills con texto — con 6 canales, el
// texto por botón no escala en mobile.
function ShareRow({
  postSlug, title, canonicalUrl, iconButtonClass,
}: {
  postSlug: string; title: string; canonicalUrl: string;
  // Override opcional — la cabecera del post la usa sobre su propio "bloque
  // de color" (ver getShareIconClass más abajo), donde el estilo neutro de
  // siempre puede quedar sin contraste; la fila del cierre del artículo
  // (siempre sobre blanco) usa el default.
  iconButtonClass?: string;
}) {
  const [copied, setCopied] = useState(false);
  const resolvedIconClass = iconButtonClass ?? 'flex items-center justify-center w-9 h-9 rounded-full border border-neutral-200 text-neutral-500 hover:border-neutral-900 hover:text-neutral-900 transition-colors shrink-0';

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setCopied(true);
      trackBlogShare({ postSlug, channel: 'copy_link' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API bloqueada (permiso denegado, contexto no seguro) — el
      // link sigue siendo copiable a mano desde la barra de direcciones,
      // no vale la pena mostrar un error por esto.
    }
  }

  const encodedUrl = encodeURIComponent(canonicalUrl);
  const encodedTitle = encodeURIComponent(title);

  const channels = [
    { key: 'whatsapp' as const, label: 'Compartir por WhatsApp', href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`, icon: <MessageCircle className="w-4 h-4" /> },
    { key: 'facebook' as const, label: 'Compartir en Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, icon: <FacebookGlyph className="w-4 h-4" /> },
    { key: 'x' as const, label: 'Compartir en X', href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`, icon: <XGlyph className="w-3.5 h-3.5" /> },
    { key: 'telegram' as const, label: 'Compartir por Telegram', href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`, icon: <Send className="w-4 h-4" /> },
    { key: 'email' as const, label: 'Compartir por correo', href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`, icon: <Mail className="w-4 h-4" /> },
  ];

  return (
    <div className="flex items-center gap-2">
      {channels.map(channel => (
        <a
          key={channel.key}
          href={channel.href}
          target={channel.key === 'email' ? undefined : '_blank'}
          rel={channel.key === 'email' ? undefined : 'noopener noreferrer'}
          onClick={() => trackBlogShare({ postSlug, channel: channel.key })}
          title={channel.label}
          aria-label={channel.label}
          className={resolvedIconClass}
        >
          {channel.icon}
        </a>
      ))}
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? 'Copiado' : 'Copiar enlace'}
        aria-label={copied ? 'Enlace copiado' : 'Copiar enlace'}
        className={resolvedIconClass}
      >
        {copied ? <Check className="w-4 h-4 text-green-dark" /> : <Link2 className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function BlogPostClient({
  post,
  relatedPosts,
  headings,
}: {
  post: BlogPost;
  relatedPosts: BlogPost[];
  headings: Heading[];
}) {
  const articleRef = useRef<HTMLElement>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const canonicalUrl = `${SITE_URL}/blog/${post.slug}`;
  const accent = getBlogAccent(post.accentColor);
  // El avatar necesita quedar visible contra cualquier color de la paleta,
  // incluido "Tinta" (fondo casi negro) — en vez de un color fijo, invierte
  // según qué tan clara o oscura sea la combinación text/muted del acento.
  const avatarClass = accent
    ? (accent.text === 'text-white' ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-white')
    : 'bg-primary text-white';
  // Mismo criterio de inversión que el avatar: los botones de compartir de
  // la cabecera vivan sobre cualquiera de los 8 fondos posibles (blanco o
  // los 7 acentos), así que su borde/texto neutro de siempre no sirve ahí
  // — necesitan su propia versión clara u oscura según corresponda.
  const shareIconClass = accent
    ? (accent.text === 'text-white'
        ? 'flex items-center justify-center w-9 h-9 rounded-full border border-white/30 text-white hover:bg-white/10 transition-colors shrink-0'
        : 'flex items-center justify-center w-9 h-9 rounded-full border border-neutral-900/25 text-neutral-900 hover:bg-neutral-900/5 transition-colors shrink-0')
    : undefined;

  // El equivalente de la vista de perfil/clase (ver ProfesorDetailClient) —
  // evento GA4 + contador propio en blog_posts.views_count, con la misma
  // deduplicación por sessionStorage para no inflar en cada F5. Se salta en
  // modo vista previa (post.status !== 'published'): una visita del propio
  // admin a su borrador no debería contar como lectura real ni ensuciar el
  // reporte de qué se lee más.
  useEffect(() => {
    if (post.status !== 'published') return;
    trackViewPost({ postSlug: post.slug, postTitle: post.title, category: post.category });
    const viewKey = `kynea_viewed_post_${post.id}`;
    if (!sessionStorage.getItem(viewKey)) {
      sessionStorage.setItem(viewKey, '1');
      createClient().rpc('increment_blog_post_views', { target_post_id: post.id }).then(() => {}, () => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSlug(visible[0].target.id);
      },
      { rootMargin: '-96px 0px -70% 0px' }
    );
    headings.forEach(h => {
      const el = document.getElementById(h.slug);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  // h2/h3 con id=slugifyHeading(texto) — mismo slug que ya calculó
  // extractHeadings() sobre el Markdown crudo en el server, así los anchors
  // del índice (#slug) siempre apuntan al encabezado real renderizado.
  const markdownComponents: Components = {
    h2: ({ children, ...rest }) => {
      const text = String(children);
      return <h2 id={slugifyHeading(text)} {...rest}>{children}</h2>;
    },
    h3: ({ children, ...rest }) => {
      const text = String(children);
      return <h3 id={slugifyHeading(text)} {...rest}>{children}</h3>;
    },
    // Fence ```cta — ver InlineCta más arriba. code/pre se overridean juntos
    // porque react-markdown siempre envuelve un fence en <pre><code>; sin
    // interceptar también <pre>, el bloque de CTA quedaría metido dentro de
    // un <pre> (fuente monoespaciada, whitespace:pre) en vez de renderizarse
    // como el link real.
    code: ({ className, children }) => {
      if (className === 'language-cta') {
        let data: { label?: string; href?: string; image?: string; style?: string } = {};
        try { data = JSON.parse(String(children).trim()); } catch {
          // Fence corrupto (editado a mano fuera de esta app) — se omite en vez de romper el render del resto del post.
        }
        return (
          <InlineCta
            label={data.label ?? ''}
            href={data.href ?? ''}
            image={data.image ?? ''}
            style={data.style ?? 'grande'}
            postSlug={post.slug}
          />
        );
      }
      return <code className={className}>{children}</code>;
    },
    pre: ({ children }) => {
      const child = Array.isArray(children) ? children[0] : children;
      if (isValidElement(child) && (child.props as { className?: string })?.className === 'language-cta') {
        return <>{children}</>;
      }
      return <pre>{children}</pre>;
    },
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Solo se ve en /blog/slug?preview=1 sobre un post que todavía no
          está publicado (ver resolvePost() en page.tsx) — para que nunca se
          confunda una vista previa con el post ya en vivo. */}
      {post.status !== 'published' && (
        <div className="bg-yellow text-neutral-900 text-center text-[13px] font-bold py-2 px-4">
          Vista previa — este post todavía es un borrador, no está publicado.
        </div>
      )}
      <Header />
      <ReadingProgressBar targetRef={articleRef} />

      {/* Cabecera del post — portada tipo revista (referencia: The Verge):
          foto cuadrada a la izquierda, toda la info (categoría, título,
          bajada, autor/hora, compartir) a la derecha. Sobre blanco por
          default, o sobre el "bloque de color" propio del post cuando el
          admin le asignó uno. La foto nunca tiene texto encima ni depende de
          un degradado para que el título se lea — el tratamiento anterior
          (foto a página completa + degradado + título superpuesto) se veía
          roto cuando la foto de turno no tenía una zona oscura donde apoyar
          texto blanco; acá la legibilidad no depende de la foto en absoluto. */}
      <div className={accent ? accent.bg : undefined}>
        <div className={`max-w-[1080px] mx-auto px-6 pt-8 sm:pt-12 pb-8 sm:pb-12`}>
          {/* min-w-0 en el span es necesario, no cosmético: dentro de un flex
              row, un item no se achica más allá de su ancho de contenido a
              menos que se le fuerce min-width:0 — sin esto, `truncate` no
              hacía nada y un título largo desbordaba el contenedor en
              mobile (scroll horizontal) en vez de cortarse con "…". */}
          <nav className={`flex items-center gap-1.5 text-[12.5px] mb-6 ${accent ? accent.muted : 'text-neutral-400'}`}>
            <Link href="/blog" className={`shrink-0 font-semibold transition-colors ${accent?.text === 'text-white' ? 'hover:text-white' : 'hover:text-neutral-900'}`}>Blog</Link>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span className="truncate min-w-0">{post.title}</span>
          </nav>

          {/* Orden invertido a propósito: en mobile (una sola columna) el
              texto va primero y la foto abajo — es como se ve en un feed
              real (referencia: The Verge en mobile), no la foto tapando el
              título antes de que el lector sepa de qué trata el post. En
              desktop sm:order-* la vuelve a poner a la izquierda. */}
          <div className={`grid gap-8 ${post.coverImage ? 'sm:grid-cols-2 sm:gap-12 sm:items-center' : ''}`}>
            <div className="sm:order-2">
              {post.category && (
                <Link
                  href={`/blog?categoria=${encodeURIComponent(post.category)}`}
                  className="badge-purple-soft text-[11px] mb-4"
                >
                  {post.category}
                </Link>
              )}
              <h1 className={`text-[28px] sm:text-[36px] font-black tracking-tight leading-[1.12] mb-4 ${accent ? accent.text : 'text-neutral-900'}`}>
                {post.title}
              </h1>
              {/* "Dek" — bajada del artículo con la barra "/" (referencia:
                  The Verge). El excerpt existía en el dato pero no se
                  mostraba en ningún lado del propio artículo, solo en las
                  cards del índice — acá cumple el rol de resumen editorial
                  de entrada. La barra usa el color fuerte del bloque (no
                  siempre text-primary): en el acento "Morado" el fondo YA es
                  el morado de marca, así que la barra tiene que pasar a
                  blanca para seguir siendo visible. */}
              {post.excerpt && (
                <p className={`flex items-start gap-3 text-[16px] sm:text-[17px] leading-snug mb-6 ${accent ? accent.muted : 'text-neutral-600'}`}>
                  <span className={`font-black text-[22px] sm:text-[24px] leading-[0.9] shrink-0 ${accent ? accent.text : 'text-primary'}`} aria-hidden="true">/</span>
                  {post.excerpt}
                </p>
              )}
              {/* Byline con avatar — mismo componente visual que el avatar
                  de usuario en Header (círculo + inicial), en vez de solo
                  texto, para que el post se sienta firmado por alguien y no
                  una nota anónima. avatarClass invierte polaridad contra el
                  acento para seguir siendo visible incluso sobre "Tinta"
                  (fondo casi negro) o "Morado" (mismo tono que el bg-primary
                  de siempre). */}
              <div className={`flex items-center gap-3 text-[13px] mb-5 ${accent ? accent.muted : 'text-neutral-500'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarClass}`}>K</span>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={`font-semibold ${accent ? accent.text : 'text-neutral-800'}`}>Equipo Kynea</span>
                  <span>·</span>
                  <span>{displayDate(post)}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {estimateReadingTime(post.content)} min de lectura</span>
                </div>
              </div>
              {/* Compartir directo en la portada — antes vivía en una fila
                  aparte debajo de toda la cabecera, separado del resto de la
                  info del post en vez de formar parte de ella. */}
              <ShareRow postSlug={post.slug} title={post.title} canonicalUrl={canonicalUrl} iconButtonClass={shareIconClass} />
            </div>

            {post.coverImage && (
              <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-neutral-100 sm:order-1">
                <SmartImage
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  sizes="(min-width: 640px) 500px, 100vw"
                  priority
                  className="object-cover"
                  style={{ objectPosition: post.coverImagePosition }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1080px] mx-auto px-6 pt-10 pb-10 sm:pb-14">
        <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-12">
          <article ref={articleRef} className="min-w-0">
            {headings.length > 1 && (
              <details className="lg:hidden mb-8 rounded-lg border border-neutral-200 bg-neutral-50 open:pb-2">
                <summary className="flex items-center gap-2 px-4 py-3 text-[13.5px] font-bold text-neutral-900 cursor-pointer select-none">
                  <List className="w-4 h-4" /> En este artículo
                </summary>
                <div className="px-4">
                  <TableOfContents headings={headings} activeSlug={activeSlug} />
                </div>
              </details>
            )}

            <div className="blog-content">
              <ReactMarkdown components={markdownComponents}>{post.content}</ReactMarkdown>
            </div>

            {post.category && (
              <div className="flex items-center gap-2.5 mt-12">
                <span className="text-[12px] font-semibold text-neutral-400">Archivado en</span>
                <Link href={`/blog?categoria=${encodeURIComponent(post.category)}`} className="badge-purple-soft text-[11px]">
                  {post.category}
                </Link>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 mt-6 pt-6 border-t border-neutral-100">
              <ShareRow postSlug={post.slug} title={post.title} canonicalUrl={canonicalUrl} />
            </div>
          </article>

          {headings.length > 1 && (
            <aside className="hidden lg:block">
              <div className="sticky top-[88px]">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-400 mb-3">
                  <List className="w-3.5 h-3.5" /> En este artículo
                </p>
                <TableOfContents headings={headings} activeSlug={activeSlug} />
              </div>
            </aside>
          )}
        </div>

        {relatedPosts.length > 0 && (
          <div className="mt-16 pt-10 border-t border-neutral-100">
            <h2 className="text-[19px] font-extrabold text-neutral-900 tracking-tight mb-5">Leé también</h2>
            <div className="grid sm:grid-cols-3 gap-5">
              {relatedPosts.map(related => (
                <Link
                  key={related.id}
                  href={`/blog/${related.slug}`}
                  className="group"
                  onClick={() => trackSelectPost({ postSlug: related.slug, postTitle: related.title, category: related.category, listName: 'blog_related' })}
                >
                  <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden bg-neutral-100 mb-2.5">
                    {related.coverImage ? (
                      <SmartImage
                        src={related.coverImage}
                        alt={related.title}
                        fill
                        sizes="240px"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                        style={{ objectPosition: related.coverImagePosition }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary-bg to-neutral-100" />
                    )}
                  </div>
                  {related.category && (
                    <span className="badge-purple-soft text-[10.5px] mb-1.5">{related.category}</span>
                  )}
                  <h3 className="text-[14px] font-bold text-neutral-900 leading-snug group-hover:text-primary transition-colors">
                    {related.title}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
