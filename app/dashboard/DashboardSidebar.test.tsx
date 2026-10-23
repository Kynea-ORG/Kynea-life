// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import DashboardSidebar from './DashboardSidebar';

afterEach(cleanup);

let pathname = '/dashboard/mis-clases';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { signOut: vi.fn() } }) }));

const profile = { id: 'u1', name: 'David', role: 'profesor' as const, photo_url: null, is_admin: false };

// Las barras mobile son las que llevan `md:hidden` + `fixed` (superior/inferior).
const mobileBars = (c: HTMLElement) =>
  [...c.querySelectorAll('div')].filter(d => d.className.includes('md:hidden') && d.className.includes('fixed'));

describe('DashboardSidebar · modo enfoque en crear-clase', () => {
  it('en una ruta normal muestra la barra superior e inferior mobile', () => {
    pathname = '/dashboard/mis-clases';
    const { container } = render(<DashboardSidebar profile={profile} />);
    expect(mobileBars(container)).toHaveLength(2);
  });

  it('en /dashboard/crear-clase oculta las barras mobile (el wizard usa toda la pantalla)', () => {
    pathname = '/dashboard/crear-clase';
    const { container } = render(<DashboardSidebar profile={profile} />);
    expect(mobileBars(container)).toHaveLength(0);
  });

  it('también al editar (?edit=…, misma ruta)', () => {
    pathname = '/dashboard/crear-clase';
    const { container } = render(<DashboardSidebar profile={profile} />);
    expect(mobileBars(container)).toHaveLength(0);
  });

  it('el sidebar de desktop se mantiene en crear-clase', () => {
    pathname = '/dashboard/crear-clase';
    const { container } = render(<DashboardSidebar profile={profile} />);
    expect(container.querySelector('aside')).not.toBeNull();
  });
});
