'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';

export default function Header({ transparent = false }: { transparent?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const base = transparent
    ? 'absolute top-0 left-0 right-0 z-50 bg-transparent'
    : 'sticky top-0 z-50 bg-white border-b border-gray-100';

  return (
    <header className={base}>
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="flex items-center justify-between h-[68px]">

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
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  transparent
                    ? 'text-white/90 hover:bg-white/10'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/dashboard"
              className={`text-sm font-medium px-4 py-2 rounded-full transition-colors ${
                transparent
                  ? 'text-white/80 hover:bg-white/10'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Mi panel
            </Link>
            <Link
              href="/login"
              className={`text-sm font-medium px-4 py-2 rounded-full border transition-colors ${
                transparent
                  ? 'border-white/40 text-white hover:bg-white/10'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="text-sm font-semibold px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-full transition-colors shadow-sm"
            >
              Publicar clase
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className={`md:hidden p-2 rounded-full transition-colors ${
              transparent ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-5 py-4 flex flex-col gap-1">
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
              className="text-sm font-medium text-gray-700 hover:text-purple-700 py-2.5 border-b border-gray-50 last:border-0"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/registro"
            onClick={() => setMobileOpen(false)}
            className="mt-2 text-sm font-bold px-5 py-3 bg-purple-700 text-white rounded-full text-center"
          >
            Publicar clase
          </Link>
        </div>
      )}
    </header>
  );
}
