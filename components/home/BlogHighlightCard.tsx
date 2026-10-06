import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import SmartImage from '@/components/SmartImage';
import type { BlogHighlight } from '@/lib/blog/highlight';

// Tarjeta del Home que invita a leer el blog con el último artículo publicado.
// Desktop: texto a la izquierda e imagen a la derecha. Mobile: la imagen va arriba (16:9)
// y el texto abajo, con el botón principal a todo el ancho para que sea fácil de tocar.
// Toda la tarjeta es clicable (el título es un enlace "estirado" al artículo); el botón y el
// enlace "Ver todo el blog" quedan por encima (z-10) para seguir siendo enlaces propios.
export default function BlogHighlightCard({ post }: { post: BlogHighlight }) {
  const href = `/blog/${post.slug}`;

  return (
    <section className="bg-white py-8 sm:py-12">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <article className="group relative grid overflow-hidden rounded-3xl border border-neutral-900 bg-neutral-50 md:grid-cols-[1.1fr_1fr]">
          {/* Imagen: arriba en mobile, a la derecha en desktop. El degradado se ve si no hay portada. */}
          <div
            className="relative order-first aspect-[16/9] md:order-last md:aspect-auto md:min-h-[320px]"
            style={{ background: 'linear-gradient(135deg, #f5e8fc 0%, #8a11bc 100%)' }}
          >
            {post.coverImage && (
              <SmartImage
                src={post.coverImage}
                alt=""
                aria-hidden="true"
                fill
                sizes="(max-width: 768px) 100vw, 560px"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                style={{ objectPosition: post.coverImagePosition || '50% 50%' }}
              />
            )}
          </div>

          <div className="relative flex flex-col justify-center gap-3 p-5 sm:p-8 md:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-primary">
                <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                Del blog de Kynea
              </span>
              {post.category && (
                <span className="text-[11px] font-semibold text-neutral-600 bg-white border border-neutral-200 rounded-full px-2.5 py-0.5">
                  {post.category}
                </span>
              )}
            </div>

            <h2 className="text-[22px] sm:text-[28px] font-black leading-[1.12] tracking-[-0.02em] text-neutral-900 line-clamp-3">
              <Link href={href} prefetch={false} className="after:absolute after:inset-0 after:content-['']">
                {post.title}
              </Link>
            </h2>

            {post.excerpt && (
              <p className="text-[14.5px] sm:text-[15.5px] leading-relaxed text-neutral-600 line-clamp-3 md:line-clamp-4">
                {post.excerpt}
              </p>
            )}

            <div className="mt-1 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-5">
              <Link
                href={href}
                prefetch={false}
                className="relative z-10 inline-flex items-center justify-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-[14px] font-bold text-white transition-[background-color,transform] hover:bg-neutral-800 active:scale-[0.97]"
              >
                Leer artículo <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link
                href="/blog"
                prefetch={false}
                className="relative z-10 text-center text-[14px] font-semibold text-primary hover:text-primary-dark"
              >
                Ver todo el blog →
              </Link>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
