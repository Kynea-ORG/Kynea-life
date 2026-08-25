'use client';
import Link from 'next/link';
import Image from 'next/image';
import SmartImage from '@/components/SmartImage';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu, X, User, Settings, LogOut,
  LayoutDashboard, PlusCircle, ChevronDown, Building2, GraduationCap,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useDelayedUnmount } from '@/lib/hooks/useDelayedUnmount';
import { trackAuthCtaClick } from '@/lib/analytics';

type Role = 'alumno' | 'profesor' | 'academia';

interface Profile {
  id: string;
  name: string;
  role: Role;
  photo_url: string | null;
  photo_position: string | null;
  photo_zoom: number | null;
}

const ROLE_LABEL: Record<Role, string> = {
  alumno:   'Alumno',
  profesor: 'Profesor',
  academia: 'Academia',
};

const NAV_LINKS = [
  { label: 'Explorar clases', href: '/clases' },
];

// Solo se agregan al panel del menú mobile cuando homeNav — el resto del
// sitio (incl. /unete/beneficios, que también usa transparent) no las ve.
const HOME_MENU_EXTRA_LINKS = [
  { label: '¿Tienes una academia?', href: '/academias', Icon: Building2 },
  { label: 'Sé profesor en Kynea', href: '/unete/beneficios', Icon: GraduationCap },
];

function Avatar({
  photoUrl,
  photoPosition,
  photoZoom,
  name,
  sizeClass = 'w-8 h-8',
  className = '',
}: {
  photoUrl: string | null | undefined;
  photoPosition?: string | null;
  photoZoom?: number | null;
  name: string | undefined;
  sizeClass?: string;
  className?: string;
}) {
  if (photoUrl) {
    return (
      <div className={`relative ${sizeClass} rounded-full overflow-hidden shrink-0 ${className}`}>
        <SmartImage src={photoUrl} alt={name ?? ''} fill sizes="48px" className="object-cover" style={{ objectPosition: photoPosition || '50% 50%', transform: `scale(${photoZoom || 1})` }} />
      </div>
    );
  }
  const initial = name?.charAt(0).toUpperCase() ?? '?';
  return (
    <div className={`${sizeClass} rounded-full bg-neutral-900 text-white flex items-center justify-center text-sm font-bold shrink-0 ${className}`}>
      {initial}
    </div>
  );
}

export default function Header({
  transparent = false,
  homeNav = false,
  className = '',
}: {
  transparent?: boolean;
  homeNav?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const shouldRenderUserMenu = useDelayedUnmount(userMenuOpen, 200);
  const shouldRenderMobileMenu = useDelayedUnmount(mobileOpen, 200);

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile(userId: string) {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, role, photo_url, photo_position, photo_zoom')
        .eq('id', userId)
        .single();
      if (data) setProfile(data as Profile);
      setAuthLoading(false);
    }

    // getUser() verifies JWT server-side (more secure than getSession)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) loadProfile(user.id);
      else setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadProfile(session.user.id);
      else { setProfile(null); setAuthLoading(false); }
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
  // El patrón de nav "home" (links de negocio junto al logo, CTA
  // simplificado) solo tiene sentido para un visitante anónimo — logueado
  // ya ve el flujo normal (Publicar clase / avatar) sin importar homeNav.
  const showHomeAnon = homeNav && !authLoading && !isLoggedIn;

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
    ? 'font-sans text-[15px] font-medium text-white/90 px-3.5 py-1.5 rounded-md hover:bg-white/10 active:opacity-70 transition-[background-color,color]'
    : 'font-sans nav-link';

  return (
    <header className={
      homeNav
        ? `bg-white border-b border-neutral-100 md:bg-transparent md:border-0 md:absolute md:top-0 md:left-0 md:right-0 md:z-50 ${className}`
        : transparent
        ? `absolute top-0 left-0 right-0 z-50 bg-transparent ${className}`
        : `bg-white border-b border-neutral-200 sticky top-0 z-50 ${className}`
    }>
      <div className="max-w-[1200px] mx-auto px-6 h-[64px] flex items-center justify-between gap-4">

        {/* Logo — en homeNav el mobile siempre es la barra blanca (logo
            oscuro) y el desktop es el overlay transparente (logo blanco);
            fuera de homeNav, una sola imagen según `transparent`. */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          {homeNav ? (
            <>
              <Image src="/logo.png" alt="Kynea" width={110} height={36} priority style={{ height: 'auto' }} className="md:hidden" />
              <Image src="/logo-white.png" alt="Kynea" width={110} height={36} priority style={{ height: 'auto' }} className="hidden md:block" />
            </>
          ) : (
            <Image
              src={transparent ? '/logo-white.png' : '/logo.png'}
              alt="Kynea"
              width={110}
              height={36}
              priority
              style={{ height: 'auto' }}
            />
          )}
          {process.env.NEXT_PUBLIC_APP_ENV === 'development' && (
            <span className="text-[10px] font-bold uppercase tracking-wide bg-amber text-amber-text rounded px-1.5 py-0.5">
              dev
            </span>
          )}
        </Link>

        {showHomeAnon && (
          <div className="hidden md:flex items-center gap-5 flex-1">
            <div className="w-px h-[22px] bg-white/25" />
            <Link href="/academias" onClick={() => trackAuthCtaClick({ action: 'registro', location: 'header_home_desktop_academia' })}
              className="font-sans text-[14px] font-medium text-white/85 hover:text-white transition-colors">
              ¿Tienes una academia?
            </Link>
            <Link href="/unete/beneficios" onClick={() => trackAuthCtaClick({ action: 'registro', location: 'header_home_desktop_profesor' })}
              className="font-sans text-[14px] font-medium text-white/85 hover:text-white transition-colors">
              Sé profesor
            </Link>
          </div>
        )}

        {/* Desktop nav */}
        {!showHomeAnon && (
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {NAV_LINKS.map(item => (
              <Link key={item.href} href={item.href} className={linkBase}>
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          {authLoading ? (
            <div className="w-40 h-9 bg-neutral-100 rounded-lg animate-pulse" />
          ) : isLoggedIn ? (
            <>
              {canPublish && (
                <Link
                  href="/dashboard/crear-clase"
                  className={`font-sans text-[15px] font-bold px-5 py-2 rounded-btn border border-neutral-900 transition-[background-color] active:scale-[0.97] flex items-center gap-2 ${
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
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-colors active:opacity-70 ${
                    transparent ? 'hover:bg-white/10' : 'hover:bg-neutral-100'
                  }`}
                >
                  <Avatar photoUrl={profile?.photo_url} photoPosition={profile?.photo_position} photoZoom={profile?.photo_zoom} name={profile?.name} sizeClass="w-8 h-8" />
                  <div className="text-left hidden lg:block">
                    <p className={`font-sans text-[13px] font-bold leading-tight ${transparent ? 'text-white' : 'text-neutral-900'}`}>
                      {profile.name.split(' ')[0]}
                    </p>
                    <p className={`font-sans text-[11px] leading-tight ${transparent ? 'text-white/70' : 'text-neutral-600'}`}>
                      {ROLE_LABEL[profile.role]}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${userMenuOpen ? 'rotate-180' : ''} ${transparent ? 'text-white/70' : 'text-neutral-400'}`} />
                </button>

                {shouldRenderUserMenu && (
                  <div className={`absolute right-0 top-full mt-2 w-56 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 z-50 overflow-hidden origin-top-right transition-[opacity,transform] duration-200 ease-out starting:opacity-0 starting:-translate-y-1 ${userMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}>
                    <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-3">
                      <Avatar photoUrl={profile?.photo_url} photoPosition={profile?.photo_position} photoZoom={profile?.photo_zoom} name={profile?.name} sizeClass="w-9 h-9" />
                      <div className="min-w-0">
                        <p className="font-sans text-[13px] font-bold text-neutral-900 truncate">{profile.name}</p>
                        <p className="font-sans text-[11px] text-neutral-600">{ROLE_LABEL[profile.role]}</p>
                      </div>
                    </div>
                    <Link href="/dashboard" onClick={() => setUserMenuOpen(false)}
                      className="font-sans flex items-center gap-3 px-4 py-2.5 text-[14px] text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 active:bg-neutral-100 transition-colors">
                      <LayoutDashboard className="w-4 h-4 shrink-0" /> Mi panel
                    </Link>
                    <Link href="/dashboard/perfil" onClick={() => setUserMenuOpen(false)}
                      className="font-sans flex items-center gap-3 px-4 py-2.5 text-[14px] text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 active:bg-neutral-100 transition-colors">
                      <User className="w-4 h-4 shrink-0" /> Perfil
                    </Link>
                    <Link href="/dashboard/configuracion" onClick={() => setUserMenuOpen(false)}
                      className="font-sans flex items-center gap-3 px-4 py-2.5 text-[14px] text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 active:bg-neutral-100 transition-colors">
                      <Settings className="w-4 h-4 shrink-0" /> Configuración
                    </Link>
                    <div className="border-t border-neutral-100">
                      <button onClick={logout}
                        className="font-sans w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-neutral-600 hover:text-red hover:bg-red-bg active:bg-red-bg transition-colors">
                        <LogOut className="w-4 h-4 shrink-0" /> Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : showHomeAnon ? (
            <>
              <Link href="/login" onClick={() => trackAuthCtaClick({ action: 'login', location: 'header_home_desktop' })}
                className="font-sans text-[14.5px] font-bold px-4.5 py-2 rounded-full border border-white/55 text-white hover:bg-white/10 transition-colors active:scale-[0.97]">
                Iniciar sesión
              </Link>
              <Link href="/registro" onClick={() => trackAuthCtaClick({ action: 'registro', location: 'header_home_desktop_registro' })}
                className="font-sans text-[14.5px] font-black px-5 py-2 rounded-full bg-white text-neutral-900 hover:bg-neutral-100 transition-colors active:scale-[0.97]">
                Regístrate gratis
              </Link>
            </>
          ) : (
            <>
              <Link href="/academias" onClick={() => trackAuthCtaClick({ action: 'registro', location: 'header_desktop_academia' })}
                className="hidden lg:inline-flex items-center gap-1.5 font-sans text-[13px] font-bold px-3.5 py-2 rounded-full border border-pink-100 bg-pink-50 text-pink-600 hover:bg-pink-100 transition-colors active:scale-[0.97]">
                <Building2 className="w-3.5 h-3.5" /> ¿Tienes una academia?
              </Link>
              <Link href="/login" onClick={() => trackAuthCtaClick({ action: 'login', location: 'header_desktop' })}
                className="font-sans text-[15px] font-semibold px-5 py-2 rounded-btn border border-neutral-900 bg-white text-neutral-900 hover:bg-neutral-100 transition-[background-color] active:scale-[0.97]">
                Iniciar sesión
              </Link>
              <Link href="/unete/beneficios" onClick={() => trackAuthCtaClick({ action: 'registro', location: 'header_desktop_profesor' })}
                className="font-sans text-[15px] font-bold px-5 py-2 rounded-btn border border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 transition-[background-color] active:scale-[0.97]">
                Únete como profesor
              </Link>
            </>
          )}
        </div>

        {/* Mobile: avatar + hamburger */}
        <div className="md:hidden flex items-center gap-2">
          {!authLoading && isLoggedIn && <Avatar photoUrl={profile?.photo_url} photoPosition={profile?.photo_position} photoZoom={profile?.photo_zoom} name={profile?.name} sizeClass="w-8 h-8" className="border-2 border-neutral-200" />}
          {showHomeAnon && (
            <Link href="/registro" onClick={() => trackAuthCtaClick({ action: 'registro', location: 'header_home_mobile_registro' })}
              className="font-sans text-[13px] font-bold text-primary border border-neutral-200 rounded-full px-3.5 py-2">
              Regístrate
            </Link>
          )}
          <button
            className={`p-2 rounded-md transition-colors active:scale-90 ${
              homeNav ? 'text-neutral-700 hover:bg-neutral-100' : transparent ? 'text-white hover:bg-white/10' : 'text-neutral-700 hover:bg-neutral-100'
            }`}
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Menú"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {shouldRenderMobileMenu && (
        <div className={`md:hidden bg-white border-t border-neutral-200 flex flex-col transition-[opacity,transform] duration-200 ease-out starting:opacity-0 starting:-translate-y-2 ${mobileOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>

          {/* User info */}
          {isLoggedIn ? (
            <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100">
              <Avatar photoUrl={profile?.photo_url} photoPosition={profile?.photo_position} photoZoom={profile?.photo_zoom} name={profile?.name} sizeClass="w-11 h-11" />
              <div>
                <p className="font-sans text-[15px] font-bold text-neutral-900">{profile.name}</p>
                <p className="font-sans text-[13px] text-neutral-600">{ROLE_LABEL[profile.role]}</p>
              </div>
            </div>
          ) : (
            <div className="px-5 py-4 border-b border-neutral-100">
              <p className="font-sans text-[14px] text-neutral-600">Encuentra clases de baile en Latinoamérica</p>
            </div>
          )}

          {/* Nav links */}
          <div className="px-3 py-2">
            {NAV_LINKS.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                className="font-sans flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 active:bg-neutral-100 transition-colors">
                {item.label}
              </Link>
            ))}
            {homeNav && HOME_MENU_EXTRA_LINKS.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                className="font-sans flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 active:bg-neutral-100 transition-colors">
                <item.Icon className="w-4 h-4 shrink-0 text-primary" /> {item.label}
              </Link>
            ))}
          </div>

          {/* Auth-dependent actions */}
          <div className="px-3 pb-4 border-t border-neutral-100">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)}
                  className="font-sans flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 transition-colors">
                  <LayoutDashboard className="w-4 h-4 shrink-0 text-neutral-400" /> Mi panel
                </Link>
                <Link href="/dashboard/perfil" onClick={() => setMobileOpen(false)}
                  className="font-sans flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 transition-colors">
                  <User className="w-4 h-4 shrink-0 text-neutral-400" /> Perfil
                </Link>
                <Link href="/dashboard/configuracion" onClick={() => setMobileOpen(false)}
                  className="font-sans flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 transition-colors">
                  <Settings className="w-4 h-4 shrink-0 text-neutral-400" /> Configuración
                </Link>
                {canPublish && (
                  <Link href="/dashboard/crear-clase" onClick={() => setMobileOpen(false)}
                    className="font-sans flex items-center justify-center gap-2 mt-2 mb-1 text-[15px] font-bold px-5 py-3 bg-neutral-900 text-white rounded-btn hover:bg-neutral-800 active:scale-[0.97] transition-[background-color]">
                    <PlusCircle className="w-4 h-4" /> Publicar clase
                  </Link>
                )}
                <button onClick={logout}
                  className="font-sans flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-neutral-600 hover:text-red hover:bg-red-bg active:bg-red-bg w-full transition-colors mt-1">
                  <LogOut className="w-4 h-4 shrink-0" /> Cerrar sesión
                </button>
              </>
            ) : homeNav ? (
              <>
                <Link href="/login" onClick={() => { trackAuthCtaClick({ action: 'login', location: 'header_home_mobile' }); setMobileOpen(false); }}
                  className="font-sans flex items-center justify-center mt-1 mb-2 text-[15px] font-semibold px-5 py-3 rounded-btn border border-neutral-900 bg-white text-neutral-900 hover:bg-neutral-100 active:scale-[0.97] transition-[background-color]">
                  Iniciar sesión
                </Link>
                <Link href="/registro" onClick={() => { trackAuthCtaClick({ action: 'registro', location: 'header_home_mobile_registro' }); setMobileOpen(false); }}
                  className="font-sans flex items-center justify-center mb-1 text-[15px] font-bold px-5 py-3 bg-primary text-white rounded-btn hover:bg-primary-dark active:scale-[0.97] transition-[background-color]">
                  Regístrate gratis
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => { trackAuthCtaClick({ action: 'login', location: 'header_mobile' }); setMobileOpen(false); }}
                  className="font-sans flex items-center justify-center mt-1 mb-2 text-[15px] font-semibold px-5 py-3 rounded-btn border border-neutral-900 bg-white text-neutral-900 hover:bg-neutral-100 active:scale-[0.97] transition-[background-color]">
                  Iniciar sesión
                </Link>
                <Link href="/unete/beneficios" onClick={() => { trackAuthCtaClick({ action: 'registro', location: 'header_mobile_profesor' }); setMobileOpen(false); }}
                  className="font-sans flex items-center justify-center mb-1 text-[15px] font-bold px-5 py-3 bg-neutral-900 text-white rounded-btn hover:bg-neutral-800 active:scale-[0.97] transition-[background-color]">
                  Únete como profesor
                </Link>
                <Link href="/academias" onClick={() => { trackAuthCtaClick({ action: 'registro', location: 'header_mobile_academia' }); setMobileOpen(false); }}
                  className="font-sans flex items-center justify-center gap-1.5 text-[13px] font-bold text-pink-600 hover:text-pink-700 active:opacity-70 transition-colors py-2">
                  <Building2 className="w-3.5 h-3.5" /> ¿Tienes una academia? Regístrate aquí
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
