'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { ArrowRight, ChevronRight, Clock, Link2, Check, List, MessageCircle } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SmartImage from '@/components/SmartImage';
import type { BlogPost } from '@/lib/blog/types';
import { estimateReadingTime, slugifyHeading, type Heading } from '@/lib/blog/helpers';
import { trackBlogCtaClick, trackBlogShare } from '@/lib/analytics';
import { SITE_URL } from '@/lib/constants';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
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

function ShareRow({ postSlug, title, canonicalUrl }: { postSlug: string; title: string; canonicalUrl: string }) {
  const [copied, setCopied] = useState(false);

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

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${title} ${canonicalUrl}`)}`;

  return (
    <div className="flex items-center gap-2">
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackBlogShare({ postSlug, channel: 'whatsapp' })}
        className="flex items-center gap-1.5 text-[12.5px] font-semibold text-neutral-600 border border-neutral-200 rounded-full px-3 py-1.5 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
      >
        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 text-[12.5px] font-semibold text-neutral-600 border border-neutral-200 rounded-full px-3 py-1.5 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-dark" /> : <Link2 className="w-3.5 h-3.5" />}
        {copied ? 'Copiado' : 'Copiar enlace'}
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
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <ReadingProgressBar targetRef={articleRef} />

      {/* Portada del post: foto a página completa con el título encima, el
          mismo tratamiento "revista" que la card destacada de /blog — antes
          la foto era una imagen chica y redondeada debajo del título, acá
          es lo primero que se ve. */}
      <div className="relative bg-neutral-900 overflow-hidden">
        {post.coverImage ? (
          <div className="relative w-full aspect-[4/3] sm:aspect-[21/9]">
            <SmartImage
              src={post.coverImage}
              alt={post.title}
              fill
              sizes="1600px"
              priority
              className="object-cover"
              style={{ objectPosition: post.coverImagePosition }}
            />
            <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.15) 100%)' }} />
          </div>
        ) : (
          <div className="h-[220px]" />
        )}

        <div className="relative sm:absolute sm:inset-x-0 sm:bottom-0 max-w-[900px] mx-auto px-6 py-8 sm:py-10">
          <nav className="flex items-center gap-1.5 text-[12.5px] text-white/60 mb-4">
            <Link href="/blog" className="font-semibold hover:text-white transition-colors">Blog</Link>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span className="truncate text-white/45">{post.title}</span>
          </nav>
          {post.category && (
            <Link
              href={`/blog?categoria=${encodeURIComponent(post.category)}`}
              className="inline-block text-[11px] font-bold uppercase tracking-wide text-white bg-primary rounded-full px-3 py-1 mb-4"
            >
              {post.category}
            </Link>
          )}
          <h1 className="text-[28px] sm:text-[40px] font-black text-white tracking-tight leading-[1.1] mb-4 max-w-[24ch]">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-[13px] text-white/60">
            <span className="font-semibold text-white/85">Equipo Kynea</span>
            {post.publishedAt && (
              <>
                <span>·</span>
                <span>{formatDate(post.publishedAt)}</span>
              </>
            )}
            <span>·</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {estimateReadingTime(post.content)} min de lectura</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1080px] mx-auto px-6 py-10 sm:py-14">
        <div className="flex items-center justify-between gap-4 mb-8 pb-6 border-b border-neutral-100">
          <ShareRow postSlug={post.slug} title={post.title} canonicalUrl={canonicalUrl} />
        </div>

        <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-12">
          <article ref={articleRef} className="min-w-0">
            {headings.length > 1 && (
              <details className="lg:hidden mb-8 rounded-xl border border-neutral-200 bg-neutral-50 open:pb-2">
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

            {post.ctaLabel && post.ctaHref && (
              <Link
                href={post.ctaHref}
                onClick={() => trackBlogCtaClick({ postSlug: post.slug, ctaHref: post.ctaHref! })}
                className="group relative block mt-12 rounded-2xl overflow-hidden border border-neutral-900"
              >
                {post.ctaImage ? (
                  <div className="relative aspect-[21/9]">
                    <SmartImage src={post.ctaImage} alt="" fill sizes="760px" className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/0" />
                    <div className="absolute inset-x-0 bottom-0 p-6 flex items-center justify-between gap-4">
                      <span className="text-[18px] font-extrabold text-white tracking-tight">{post.ctaLabel}</span>
                      <ArrowRight className="w-5 h-5 text-white shrink-0" />
                    </div>
                  </div>
                ) : (
                  <div className="bg-neutral-900 p-6 flex items-center justify-between gap-4">
                    <span className="text-[18px] font-extrabold text-white tracking-tight">{post.ctaLabel}</span>
                    <ArrowRight className="w-5 h-5 text-white shrink-0" />
                  </div>
                )}
              </Link>
            )}

            <div className="flex items-center justify-between gap-4 mt-10 pt-6 border-t border-neutral-100">
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
                <Link key={related.id} href={`/blog/${related.slug}`} className="group">
                  <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-neutral-100 mb-2.5">
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
