'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Header({ transparent = false }: { transparent?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const base = transparent
    ? 'absolute top-0 left-0 right-0 z-50 bg-transparent'
    : 'navbar';

  return (
    <header className={base}>
      <div className={transparent ? 'max-w-[1200px] mx-auto px-6 h-[64px] flex items-center justify-between' : 'navbar-inner'}>

        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="/logo.svg"
            alt="Kynea"
            width={110}
            height={36}
            priority
            className={transparent ? 'brightness-0 invert' : ''}
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { label: 'Explorar clases', href: '/clases' },
            { label: 'Ver en mapa', href: '/mapa' },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={transparent
                ? 'text-[15px] font-medium text-white/90 px-3.5 py-1.5 rounded-md hover:bg-white/10 transition-all'
                : 'nav-link'
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/dashboard"
            className={transparent
              ? 'text-[15px] font-medium text-white/80 px-3.5 py-1.5 rounded-md hover:bg-white/10 transition-all'
              : 'nav-link'
            }
          >
            Mi panel
          </Link>
          <Link
            href="/login"
            className={`text-[15px] font-semibold px-5 py-2 rounded-btn border-2 transition-all ${
              transparent
                ? 'border-white/40 text-white hover:bg-white/10'
                : 'border-neutral-300 text-neutral-700 hover:border-neutral-900 hover:bg-neutral-50'
            }`}
          >
            Iniciar sesión
          </Link>
          <Link
            href="/registro"
            className={`text-[15px] font-bold px-5 py-2 rounded-btn transition-all ${
              transparent
                ? 'bg-white text-neutral-900 hover:bg-neutral-100'
                : 'bg-neutral-900 text-white hover:bg-neutral-800'
            }`}
          >
            Publicar clase
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className={`md:hidden p-2 rounded-md transition-all ${
            transparent ? 'text-white hover:bg-white/10' : 'text-neutral-700 hover:bg-neutral-100'
          }`}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-neutral-200 px-5 py-4 flex flex-col gap-1">
          {[
            { label: 'Explorar clases', href: '/clases' },
            { label: 'Ver en mapa', href: '/mapa' },
            { label: 'Mi panel (demo)', href: '/dashboard' },
            { label: 'Iniciar sesión', href: '/login' },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="text-[15px] font-medium text-neutral-700 hover:text-neutral-900 py-2.5 border-b border-neutral-100 last:border-0"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/registro"
            onClick={() => setMobileOpen(false)}
            className="mt-3 text-[15px] font-bold px-5 py-3 bg-neutral-900 text-white rounded-btn text-center hover:bg-neutral-800 transition-all"
          >
            Publicar clase
          </Link>
        </div>
      )}
    </header>
  );
}
