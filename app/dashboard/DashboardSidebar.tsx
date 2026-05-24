'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, PlusCircle, Upload, User,
  Settings, LogOut, Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Role = 'alumno' | 'profesor' | 'academia';

interface Profile {
  id: string;
  name: string;
  role: Role;
  photo_url: string | null;
}

const BADGE = {
  alumno:   { label: 'Alumno',   bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-100' },
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
    { href: '/dashboard/importar-csv', label: 'Importar CSV',   icon: Upload },
    { href: '/dashboard/perfil',       label: 'Perfil',         icon: User },
    { href: '/dashboard/configuracion',label: 'Configuración',  icon: Settings },
  ],
  academia: [
    { href: '/dashboard',              label: 'Inicio',         icon: LayoutDashboard },
    { href: '/dashboard/mis-clases',   label: 'Mis clases',     icon: BookOpen },
    { href: '/dashboard/profesores',   label: 'Profesores',     icon: Users },
    { href: '/dashboard/crear-clase',  label: 'Crear clase',    icon: PlusCircle },
    { href: '/dashboard/importar-csv', label: 'Importar CSV',   icon: Upload },
    { href: '/dashboard/perfil',       label: 'Perfil',         icon: User },
    { href: '/dashboard/configuracion',label: 'Configuración',  icon: Settings },
  ],
};

export default function DashboardSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();

  const badge = BADGE[profile.role];
  const NAV   = NAV_BY_ROLE[profile.role];

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  function NavLinks({ items }: { items: typeof NAV }) {
    return (
      <>
        {items.map(item => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition-colors ${
                active
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
              {item.label === 'Crear clase' && (profile.role === 'profesor' || profile.role === 'academia') && (
                <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-white/20 text-white' : 'bg-neutral-900 text-white'}`}>+</span>
              )}
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <>
      {/* Mobile top bar — logo links back to public home */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-neutral-200 px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt="Kynea" width={90} height={28} priority />
        </Link>
        {profile.photo_url ? (
          <img src={profile.photo_url} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-neutral-200" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {profile.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-neutral-200 shrink-0">
        <div className="p-6 border-b border-neutral-200">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="Kynea" width={100} height={32} priority />
          </Link>
        </div>

        <div className="px-4 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt="Profile" className="w-10 h-10 rounded-xl object-cover" />
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
        </div>

        <nav className="flex-1 py-4 px-3">
          <NavLinks items={NAV} />
        </nav>

        <div className="p-4 border-t border-neutral-200">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-500 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
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
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                    active ? 'text-neutral-900' : 'text-neutral-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{item.label.split(' ')[0]}</span>
                </Link>
              );
            });
          })()}
        </div>
      </div>
    </>
  );
}
