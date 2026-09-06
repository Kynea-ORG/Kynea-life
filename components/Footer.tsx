import Link from 'next/link';
import Image from 'next/image';

// Columna de estilos populares — mismo curado que HOME_CATEGORY_SLUGS en
// HomeClient.tsx (independiente del ord real del catálogo), repetido acá
// porque ese archivo es 'use client' y este footer se usa también desde
// Server Components. Enlaza solo estilos con clases activas a propósito:
// linkear una categoría vacía (noindex, ver app/categorias/[slug]/page.tsx)
// gastaría presupuesto de rastreo en una página que Google ya ignora.
const FOOTER_STYLES = [
  { name: 'Salsa', slug: 'salsa' },
  { name: 'Bachata', slug: 'bachata' },
  { name: 'Heels', slug: 'heels' },
  { name: 'Reggaetón', slug: 'reggaeton' },
  { name: 'Hip Hop', slug: 'hip-hop' },
  { name: 'Contemporáneo', slug: 'contemporaneo' },
];

const EXPLORAR_LINKS = [
  { label: 'Explorar clases', href: '/clases' },
  { label: 'Profesores', href: '/profesores' },
  { label: 'Academias', href: '/academias' },
  { label: 'Mapa de clases', href: '/mapa' },
];

const PROFESIONALES_LINKS = [
  { label: 'Sé profesor en Kynea', href: '/unete/beneficios' },
  { label: '¿Tienes una academia?', href: '/academias/unete' },
];

const LEGAL_LINKS = [
  { label: 'Términos y condiciones', href: '/terminos' },
  { label: 'Términos de publicación', href: '/terminos-publicacion' },
  { label: 'Privacidad', href: '/privacidad' },
];

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="font-sans text-[13px] font-bold uppercase tracking-wide text-neutral-500 mb-4">{title}</h3>
      <ul className="space-y-2.5">
        {links.map(l => (
          <li key={l.href}>
            <Link href={l.href} className="font-sans text-[14px] text-neutral-300 hover:text-white transition-colors">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="bg-neutral-900">
      <div className="max-w-[1200px] mx-auto px-6 py-14">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-8 gap-y-10">
          <div className="col-span-2 sm:col-span-3 md:col-span-1">
            <Image src="/logo-white.png" alt="Kynea" width={100} height={34} style={{ width: '100px', height: 'auto' }} />
            <p className="font-figtree text-[13.5px] text-neutral-400 leading-relaxed mt-4 max-w-[220px]">
              La primera plataforma integral de danza en Latinoamérica.
            </p>
          </div>

          <FooterColumn title="Explorar" links={EXPLORAR_LINKS} />
          <FooterColumn
            title="Estilos populares"
            links={FOOTER_STYLES.map(s => ({ label: s.name, href: `/categorias/${s.slug}` }))}
          />
          <FooterColumn title="Para profesionales" links={PROFESIONALES_LINKS} />
          <FooterColumn title="Legal" links={LEGAL_LINKS} />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pt-8 border-t border-white/10">
          <p className="font-sans text-[13px] text-neutral-500">
            © {new Date().getFullYear()} Kynea. Todos los derechos reservados.
          </p>
          <a href="mailto:hola@kynea.pe" className="font-sans text-[13px] text-neutral-400 hover:text-white transition-colors">
            hola@kynea.pe
          </a>
        </div>
      </div>
    </footer>
  );
}
