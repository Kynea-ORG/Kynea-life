'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { trackSelectProfile } from '@/lib/analytics';

// Client wrapper so a Server Component page (app/profesores/page.tsx) can
// still fire select_profile on a profile card click — the tracking needs an
// onClick handler, which only a Client Component can carry. Everything else
// about the link (styling, children) stays with the caller.
export default function TrackedProfileLink({
  href,
  role,
  profileId,
  profileName,
  listName,
  className,
  children,
}: {
  href: string;
  role: 'profesor' | 'academia';
  profileId: string;
  profileName: string;
  listName: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={() => trackSelectProfile({ role, profileId, profileName, listName })}
      className={className}
    >
      {children}
    </Link>
  );
}
