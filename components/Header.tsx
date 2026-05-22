'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu, X, User, Settings, LogOut,
  LayoutDashboard, PlusCircle, ChevronDown,
} from 'lucide-react';

type Role = 'alumno' | 'profesor' | 'academia';

const ROLE_USERS: Record<Role, { name: string; firstName: string; type: string; photo: string }> = {
  alumno: {
    name: 'Laura García',
    firstName: 'Laura',
    type: 'Alumna',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80',
  },
  profesor: {
    name: 'Sofía Vega',
    firstName: 'Sofía',
    type: 'Profesora',
    photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&q=80',
  },
  academia: {
    name: 'Academia Ritmo Latino',
    firstName: 'Academia',
    type: 'Academia',
    photo: 'https://images.unsplash.com/photo-1535525153412-5a42439a210d?w=80&q=80',
  },
};

const NAV_LINKS = [
  { label: 'Explorar clases', href: '/clases' },
  { label: 'Ver en mapa', href: '/mapa' },
];

export default function Header({ transparent = false }: { transparent?: boolean }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('demo_role') as Role | null;
    if (stored && stored in ROLE_USERS) setRole(stored);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const user = role ? ROLE_USERS[role] : null;
  const canPublish = role === 'profesor' || role === 'academia';

  const switchRole = (newRole: Role) => {
    localStorage.setItem('demo_role', newRole);
    setRole(newRole);
    setMobileOpen(false);
  };

  const logout = () => {
    localStorage.removeItem('demo_role');
    setRole(null);
    setUserMenuOpen(false);
    setMobileOpen(false);
    router.push('/');
  };

  const linkBase = transparent
    ? 'text-[15px] font-medium text-white/90 px-3.5 py-1.5 rounded-md hover:bg-white/10 transition-all'
    : 'nav-link';

  return (
    <header className={
      transparent
        ? 'absolute top-0 left-0 right-0 z-50 bg-transparent'
        : 'bg-white border-b border-neutral-200 sticky top-0 z-50'
    }>
      <div className="max-w-[1200px] mx-auto px-6 h-[64px] flex items-center justify-between gap-4">

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
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV_LINKS.map(item => (
            <Link key={item.href} href={item.href} className={linkBase}>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {/* Publicar clase — solo profesor/academia */}
              {canPublish && (
                <Link
                  href="/dashboard/crear-clase"
                  className={`text-[15px] font-bold px-5 py-2 rounded-btn transition-all flex items-center gap-2 ${
                    transparent
                      ? 'bg-white text-neutral-900 hover:bg-neutral-100'
                      : 'bg-neutral-900 text-white hover:bg-neutral-800'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" /> Publicar clase
                </Link>
              )}

              {/* Avatar + dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all ${
                    transparent ? 'hover:bg-white/10' : 'hover:bg-neutral-100'
                  }`}
                >
                  <img
                    src={user.photo}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="text-left hidden lg:block">
                    <p className={`text-[13px] font-bold leading-tight ${transparent ? 'text-white' : 'text-neutral-900'}`}>
                      {user.firstName}
                    </p>
                    <p className={`text-[11px] leading-tight ${transparent ? 'text-white/70' : 'text-neutral-500'}`}>
                      {user.type}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${userMenuOpen ? 'rotate-180' : ''} ${transparent ? 'text-white/70' : 'text-neutral-400'}`} />
                </button>

                {/* Dropdown menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 z-50 overflow-hidden">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-3">
                      <img src={user.photo} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-neutral-900 truncate">{user.name}</p>
                        <p className="text-[11px] text-neutral-500">{user.type}</p>
                      </div>
                    </div>

                    <Link
                      href="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 shrink-0" /> Mi panel
                    </Link>
                    <Link
                      href="/dashboard/perfil"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                    >
                      <User className="w-4 h-4 shrink-0" /> Perfil
                    </Link>
                    <Link
                      href="/dashboard/configuracion"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                    >
                      <Settings className="w-4 h-4 shrink-0" /> Configuración
                    </Link>

                    {/* Demo switcher inside dropdown */}
                    <div className="px-4 py-3 border-t border-neutral-100">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Demo</p>
                      <div className="flex gap-1">
                        {(['alumno', 'profesor', 'academia'] as const).map(r => (
                          <button
                            key={r}
                            onClick={() => { switchRole(r); setUserMenuOpen(false); }}
                            className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg capitalize transition-all ${
                              role === r ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100'
                            }`}
                          >
                            {r === 'alumno' ? 'Alumno' : r === 'profesor' ? 'Profe' : 'Acad.'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-neutral-100">
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-neutral-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4 shrink-0" /> Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/dashboard" className={linkBase}>Mi panel</Link>
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
            </>
          )}
        </div>

        {/* Mobile: avatar + hamburger */}
        <div className="md:hidden flex items-center gap-2">
          {user && (
            <img
              src={user.photo}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover border-2 border-neutral-200"
            />
          )}
          <button
            className={`p-2 rounded-md transition-all ${
              transparent ? 'text-white hover:bg-white/10' : 'text-neutral-700 hover:bg-neutral-100'
            }`}
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Menú"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-neutral-200 flex flex-col">

          {/* User info (logged in) */}
          {user ? (
            <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100">
              <img src={user.photo} alt={user.name} className="w-11 h-11 rounded-full object-cover" />
              <div>
                <p className="text-[15px] font-bold text-neutral-900">{user.name}</p>
                <p className="text-[13px] text-neutral-500">{user.type}</p>
              </div>
            </div>
          ) : (
            /* Guest greeting */
            <div className="px-5 py-4 border-b border-neutral-100">
              <p className="text-[14px] text-neutral-500">¿Eres profesor o academia?</p>
            </div>
          )}

          {/* Nav links — always visible */}
          <div className="px-3 py-2">
            {NAV_LINKS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Auth-dependent links */}
          <div className="px-3 pb-2 border-t border-neutral-100">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0 text-neutral-400" /> Mi panel
                </Link>
                <Link
                  href="/dashboard/perfil"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <User className="w-4 h-4 shrink-0 text-neutral-400" /> Perfil
                </Link>
                <Link
                  href="/dashboard/configuracion"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <Settings className="w-4 h-4 shrink-0 text-neutral-400" /> Configuración
                </Link>

                {/* Publicar clase — solo profesor/academia */}
                {canPublish && (
                  <Link
                    href="/dashboard/crear-clase"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 mx-0 mt-2 mb-1 text-[15px] font-bold px-5 py-3 bg-neutral-900 text-white rounded-btn hover:bg-neutral-800 transition-all"
                  >
                    <PlusCircle className="w-4 h-4" /> Publicar clase
                  </Link>
                )}

                <button
                  onClick={logout}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-neutral-500 hover:text-red-500 hover:bg-red-50 w-full transition-colors mt-1"
                >
                  <LogOut className="w-4 h-4 shrink-0" /> Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/registro"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center mt-2 mb-1 text-[15px] font-bold px-5 py-3 bg-neutral-900 text-white rounded-btn hover:bg-neutral-800 transition-all"
                >
                  Publicar clase
                </Link>
              </>
            )}
          </div>

          {/* Demo role switcher — siempre visible en mobile */}
          <div className="px-5 py-4 border-t border-neutral-100 bg-neutral-50">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2.5">
              Ver demo como
            </p>
            <div className="flex gap-1.5">
              {(['alumno', 'profesor', 'academia'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => switchRole(r)}
                  className={`flex-1 text-[13px] font-bold py-2 rounded-xl transition-all ${
                    role === r
                      ? 'bg-neutral-900 text-white'
                      : 'bg-white text-neutral-500 border border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  {r === 'alumno' ? 'Alumno' : r === 'profesor' ? 'Profesor' : 'Academia'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
