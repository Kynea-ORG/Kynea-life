import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import FeatureCard, { FEATURE_CARD_CTA, FEATURE_CARD_TEXT, FEATURE_CARD_TITLE } from './FeatureCard';
import type { BlogHighlight } from '@/lib/blog/highlight';

// Tarjeta que invita a leer el blog con el último artículo publicado. Usa su portada como fondo.
// El título es un enlace "estirado" al artículo (toda la tarjeta es clicable); el botón y
// "Ver todo el blog" quedan por encima (z-10) como enlaces propios.
export default function BlogHighlightCard({ post }: { post: BlogHighlight }) {
  const href = `/blog/${post.slug}`;
  // La portada va primero; el degradado de marca se ve si no hay portada o falla la carga.
  const fallback = 'linear-gradient(135deg, #6d0d97 0%, #8a11bc 100%)';
  const background = post.coverImage ? `url('${post.coverImage}'), ${fallback}` : fallback;

  return (
    <FeatureCard background={background} veil={Boolean(post.coverImage)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white/90">
          <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
          Del blog de Kynea
        </span>
        {post.category && (
          <span className="text-[11px] font-semibold text-white bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-2.5 py-0.5">
            {post.category}
          </span>
        )}
      </div>

      <h2 className={FEATURE_CARD_TITLE}>
        <Link href={href} prefetch={false} className="after:absolute after:inset-0 after:content-['']">
          {post.title}
        </Link>
      </h2>

      {/* En mobile se omite el resumen: sobre una foto ocupada resta contraste y alarga la tarjeta.
          Va en un contenedor porque line-clamp (display:-webkit-box) anula a `hidden` en el mismo elemento. */}
      {post.excerpt && (
        <div className="hidden sm:block">
          <p className={FEATURE_CARD_TEXT}>{post.excerpt}</p>
        </div>
      )}

      <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link href={href} prefetch={false} className={FEATURE_CARD_CTA}>
          Leer artículo <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
        <Link href="/blog" prefetch={false} className="relative z-10 text-[14px] font-semibold text-white/90 hover:text-white underline-offset-4 hover:underline">
          Ver todo el blog →
        </Link>
      </div>
    </FeatureCard>
  );
}
