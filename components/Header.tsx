'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu, X, User, Settings, LogOut,
  LayoutDashboard, PlusCircle, ChevronDown,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Role = 'alumno' | 'profesor' | 'academia';

interface Profile {
  id: string;
  name: string;
  role: Role;
  photo_url: string | null;
}

const ROLE_LABEL: Record<Role, string> = {
  alumno:   'Alumno',
  profesor: 'Profesor',
  academia: 'Academia',
};

const NAV_LINKS = [
  { label: 'Explorar clases', href: '/clases' },
];

export default function Header({ transparent = false }: { transparent?: boolean }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile(userId: string) {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, role, photo_url')
        .eq('id', userId)
        .single();
      if (data) setProfile(data as Profile);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isLoggedIn = !!profile;
  const canPublish = profile?.role === 'profesor' || profile?.role === 'academia';

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null);
    setUserMenuOpen(false);
    setMobileOpen(false);
    router.push('/');
    router.refresh();
  }

  const linkBase = transparent
    ? 'text-[15px] font-medium text-white/90 px-3.5 py-1.5 rounded-md hover:bg-white/10 transition-all'
    : 'nav-link';

  function Avatar({ size = 8, className = '' }: { size?: number; className?: string }) {
    if (profile?.photo_url) {
      return (
        <img
          src={profile.photo_url}
          alt={profile.name}
          className={`w-${size} h-${size} rounded-full object-cover ${className}`}
        />
      );
    }
    const initial = profile?.name?.charAt(0).toUpperCase() ?? '?';
    return (
      <div className={`w-${size} h-${size} rounded-full bg-neutral-900 text-white flex items-center justify-center text-sm font-bold shrink-0 ${className}`}>
        {initial}
      </div>
    );
  }

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
            src={transparent ? '/logo-white.png' : '/logo.png'}
            alt="Kynea"
            width={110}
            height={36}
            priority
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
          {isLoggedIn ? (
            <>
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

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all ${
                    transparent ? 'hover:bg-white/10' : 'hover:bg-neutral-100'
                  }`}
                >
                  <Avatar size={8} />
                  <div className="text-left hidden lg:block">
                    <p className={`text-[13px] font-bold leading-tight ${transparent ? 'text-white' : 'text-neutral-900'}`}>
                      {profile.name.split(' ')[0]}
                    </p>
                    <p className={`text-[11px] leading-tight ${transparent ? 'text-white/70' : 'text-neutral-500'}`}>
                      {ROLE_LABEL[profile.role]}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${userMenuOpen ? 'rotate-180' : ''} ${transparent ? 'text-white/70' : 'text-neutral-400'}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-3">
                      <Avatar size={9} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-neutral-900 truncate">{profile.name}</p>
                        <p className="text-[11px] text-neutral-500">{ROLE_LABEL[profile.role]}</p>
                      </div>
                    </div>
                    <Link href="/dashboard" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors">
                      <LayoutDashboard className="w-4 h-4 shrink-0" /> Mi panel
                    </Link>
                    <Link href="/dashboard/perfil" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors">
                      <User className="w-4 h-4 shrink-0" /> Perfil
                    </Link>
                    <Link href="/dashboard/configuracion" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors">
                      <Settings className="w-4 h-4 shrink-0" /> Configuración
                    </Link>
                    <div className="border-t border-neutral-100">
                      <button onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-neutral-500 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <LogOut className="w-4 h-4 shrink-0" /> Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login"
                className={`text-[15px] font-semibold px-5 py-2 rounded-btn border-2 transition-all ${
                  transparent
                    ? 'border-white/40 text-white hover:bg-white/10'
                    : 'border-neutral-300 text-neutral-700 hover:border-neutral-900 hover:bg-neutral-50'
                }`}>
                Iniciar sesión
              </Link>
              <Link href="/registro"
                className={`text-[15px] font-bold px-5 py-2 rounded-btn transition-all ${
                  transparent
                    ? 'bg-white text-neutral-900 hover:bg-neutral-100'
                    : 'bg-neutral-900 text-white hover:bg-neutral-800'
                }`}>
                Publicar clase
              </Link>
            </>
          )}
        </div>

        {/* Mobile: avatar + hamburger */}
        <div className="md:hidden flex items-center gap-2">
          {isLoggedIn && <Avatar size={8} className="border-2 border-neutral-200" />}
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

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-neutral-200 flex flex-col">

          {/* User info */}
          {isLoggedIn ? (
            <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100">
              <Avatar size={11} />
              <div>
                <p className="text-[15px] font-bold text-neutral-900">{profile.name}</p>
                <p className="text-[13px] text-neutral-500">{ROLE_LABEL[profile.role]}</p>
              </div>
            </div>
          ) : (
            <div className="px-5 py-4 border-b border-neutral-100">
              <p className="text-[14px] text-neutral-500">Encuentra clases de baile en el Perú</p>
            </div>
          )}

          {/* Nav links */}
          <div className="px-3 py-2">
            {NAV_LINKS.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors">
                {item.label}
              </Link>
            ))}
          </div>

          {/* Auth-dependent actions */}
          <div className="px-3 pb-4 border-t border-neutral-100">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
                  <LayoutDashboard className="w-4 h-4 shrink-0 text-neutral-400" /> Mi panel
                </Link>
                <Link href="/dashboard/perfil" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
                  <User className="w-4 h-4 shrink-0 text-neutral-400" /> Perfil
                </Link>
                <Link href="/dashboard/configuracion" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
                  <Settings className="w-4 h-4 shrink-0 text-neutral-400" /> Configuración
                </Link>
                {canPublish && (
                  <Link href="/dashboard/crear-clase" onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 mt-2 mb-1 text-[15px] font-bold px-5 py-3 bg-neutral-900 text-white rounded-btn hover:bg-neutral-800 transition-all">
                    <PlusCircle className="w-4 h-4" /> Publicar clase
                  </Link>
                )}
                <button onClick={logout}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-neutral-500 hover:text-red-500 hover:bg-red-50 w-full transition-colors mt-1">
                  <LogOut className="w-4 h-4 shrink-0" /> Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
                  Iniciar sesión
                </Link>
                <Link href="/registro" onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center mt-2 mb-1 text-[15px] font-bold px-5 py-3 bg-neutral-900 text-white rounded-btn hover:bg-neutral-800 transition-all">
                  Publicar clase
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
