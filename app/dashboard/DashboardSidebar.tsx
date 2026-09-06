'use client';
import Link from 'next/link';
import Image from 'next/image';
import SmartImage from '@/components/SmartImage';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, BookOpen, PlusCircle, Upload, User,
  Settings, LogOut, Shield, Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Role = 'alumno' | 'profesor' | 'academia';

interface Profile {
  id: string;
  name: string;
  role: Role;
  photo_url: string | null;
  is_admin: boolean;
}

const BADGE = {
  alumno:   { label: 'Alumno',   bg: 'bg-blue-pastel-bg', text: 'text-blue-pastel-text', border: 'border-blue-pastel/30' },
  profesor: { label: 'Profesor', bg: 'bg-neutral-100', text: 'text-neutral-700', border: 'border-neutral-200' },
  academia: { label: 'Academia', bg: 'bg-pink-50',     text: 'text-pink-600',    border: 'border-pink-100' },
};

const NAV_BY_ROLE = {
  alumno: [
    { href: '/dashboard/alumno',       label: 'Mis clases',     icon: BookOpen },
    { href: '/dashboard/perfil',       label: 'Perfil',         icon: User },
    { href: '/dashboard/configuracion',label: 'Configuración',  icon: Settings },
  ],
  profesor: [
    { href: '/dashboard',              label: 'Inicio',         icon: LayoutDashboard },
    { href: '/dashboard/mis-clases',   label: 'Mis clases',     icon: BookOpen },
    { href: '/dashboard/crear-clase',  label: 'Crear clase',    icon: PlusCircle },
    { href: '/dashboard/importar-csv', label: 'Subir clases masivas', icon: Upload },
    { href: '/dashboard/perfil',       label: 'Perfil',         icon: User },
    { href: '/dashboard/configuracion',label: 'Configuración',  icon: Settings },
  ],
  academia: [
    { href: '/dashboard',              label: 'Inicio',         icon: LayoutDashboard },
    { href: '/dashboard/mis-clases',   label: 'Mis clases',     icon: BookOpen },
    // 'Profesores' (roster) deliberadamente oculto — corre sobre datos mock,
    // no persiste nada real. Ver docs/TASKS.md sección 8.8.
    { href: '/dashboard/crear-clase',  label: 'Crear clase',    icon: PlusCircle },
    { href: '/dashboard/importar-csv', label: 'Subir clases masivas', icon: Upload },
    { href: '/dashboard/perfil',       label: 'Perfil',         icon: User },
    { href: '/dashboard/configuracion',label: 'Configuración',  icon: Settings },
  ],
};

type NavItem = (typeof NAV_BY_ROLE)[Role][number];

function NavLinks({
  items,
  pathname,
  isEditingClass,
}: {
  items: NavItem[];
  pathname: string;
  isEditingClass: boolean;
}) {
  return (
    <>
      {items.map(item => {
        const Icon = item.icon;
        const isCrearClase = item.href === '/dashboard/crear-clase';
        const active = !(isCrearClase && isEditingClass)
          && (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)) || (item.href === '/dashboard/admin/resumen' && pathname.startsWith('/dashboard/admin')));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition-[background-color,color,transform] active:scale-[0.98] ${
              active
                ? 'bg-primary text-white active:bg-primary-dark'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 active:bg-neutral-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export default function DashboardSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditingClass = pathname === '/dashboard/crear-clase' && Boolean(searchParams.get('edit'));

  const badge = BADGE[profile.role];
  const NAV   = profile.is_admin
    ? [...NAV_BY_ROLE[profile.role], { href: '/dashboard/admin/resumen', label: 'Admin', icon: Shield }]
    : NAV_BY_ROLE[profile.role];

  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <>
      {/* Mobile top bar — logo links back to public home */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-neutral-200 px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt="Kynea" width={90} height={28} priority />
        </Link>
        {profile.photo_url ? (
          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-neutral-200 shrink-0">
            <SmartImage src={profile.photo_url} alt="Profile" fill sizes="32px" className="object-cover" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {profile.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-neutral-100 shrink-0">
        <div className="p-6 border-b border-neutral-100">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="Kynea" width={100} height={32} priority />
          </Link>
        </div>

        <Link href="/dashboard/perfil" className="px-4 py-4 border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
          <div className="flex items-center gap-3">
            {profile.photo_url ? (
              <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0">
                <SmartImage src={profile.photo_url} alt="Profile" fill sizes="40px" className="object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center text-sm font-bold shrink-0">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-neutral-900 truncate">{profile.name}</p>
              <span className={`text-[10px] font-bold ${badge.bg} ${badge.text} border ${badge.border} px-2 py-0.5 rounded-full`}>
                {badge.label}
              </span>
            </div>
          </div>
        </Link>

        <nav className="flex-1 py-4 px-3">
          <NavLinks items={NAV} pathname={pathname} isEditingClass={isEditingClass} />
        </nav>

        <div className="p-4 border-t border-neutral-100">
          <button
            onClick={logout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-600 hover:text-red hover:bg-red-bg transition-[background-color,color,transform] active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
          >
            {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            {loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav — always includes Perfil as last tab */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-50 px-2 py-2">
        <div className="flex justify-around">
          {(() => {
            const perfilItem = NAV.find(i => i.href === '/dashboard/perfil');
            const others = NAV.filter(i => i.href !== '/dashboard/perfil').slice(0, 4);
            const mobileItems = perfilItem ? [...others, perfilItem] : NAV.slice(0, 5);
            return mobileItems.map(item => {
              const Icon = item.icon;
              const isCrearClase = item.href === '/dashboard/crear-clase';
              const active = !(isCrearClase && isEditingClass)
                && (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)) || (item.href === '/dashboard/admin/resumen' && pathname.startsWith('/dashboard/admin')));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-[background-color,color,transform] active:scale-90 ${
                    active ? 'bg-primary-bg text-primary' : 'text-neutral-400 active:text-primary'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[11px] font-medium">{item.label.split(' ')[0]}</span>
                </Link>
              );
            });
          })()}
        </div>
      </div>
    </>
  );
}
