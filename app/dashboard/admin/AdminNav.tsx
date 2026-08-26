'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNav({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();

  const isResumen = pathname === '/dashboard/admin/resumen';
  const isAcademias = pathname.startsWith('/dashboard/admin/academias');
  const isUsuarios = !isResumen && !isAcademias && pathname.startsWith('/dashboard/admin');

  const tabClass = (active: boolean) =>
    `text-sm font-semibold px-3 py-2.5 border-b-2 transition-colors ${
      active
        ? 'border-neutral-900 text-neutral-900 font-bold'
        : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
    }`;

  return (
    <div className="flex items-center gap-1 px-6 lg:px-8 pt-6 border-b border-neutral-100">
      <Link href="/dashboard/admin/resumen" className={tabClass(isResumen)}>
        Resumen
      </Link>
      <Link href="/dashboard/admin" className={tabClass(isUsuarios)}>
        Usuarios
      </Link>
      <Link href="/dashboard/admin/academias" className={`flex items-center gap-1.5 ${tabClass(isAcademias)}`}>
        Solicitudes de academia
        {pendingCount > 0 && (
          <span className="text-[10px] font-bold bg-pink-600 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
            {pendingCount}
          </span>
        )}
      </Link>
    </div>
  );
}
