// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Header from './Header';

afterEach(cleanup);

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({ profile: null, loading: false, signOut: vi.fn() }),
}));
vi.mock('@/lib/analytics', () => ({ trackAuthCtaClick: vi.fn() }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));

const slot = <div data-testid="compact-search">buscador</div>;

describe('Header · modo compacto de la Home (desktop)', () => {
  it('sin compact: transparente sobre el hero, sin buscador', () => {
    const { container } = render(<Header transparent homeNav compactSearch={slot} />);
    const header = container.querySelector('header')!;
    expect(header.className).toContain('md:bg-transparent');
    // Absoluto (no fijo): debe quedar debajo del banner amarillo de la Home,
    // que está en el flujo arriba del hero — fijo en top-0 lo taparía.
    expect(header.className).toContain('md:absolute');
    expect(header.className).not.toContain('md:fixed');
    expect(screen.queryByTestId('compact-search')).not.toBeInTheDocument();
  });

  it('con compact: barra blanca fija con el buscador', () => {
    const { container } = render(<Header transparent homeNav compact compactSearch={slot} />);
    const header = container.querySelector('header')!;
    expect(header.className).toContain('md:bg-white');
    expect(header.className).not.toContain('md:bg-transparent');
    expect(header.className).toContain('md:fixed');
    expect(header.className).not.toContain('md:absolute');
    expect(screen.getByTestId('compact-search')).toBeInTheDocument();
  });

  it('con compact: el logo pasa al oscuro (la barra ahora es blanca)', () => {
    const { container } = render(<Header transparent homeNav compact compactSearch={slot} />);
    expect(container.querySelector('picture')).toBeNull();
    expect(container.querySelector('img[alt="Kynea"]')?.getAttribute('src')).toBe('/logo.png');
  });

  it('con compact: los links de negocio dejan lugar al buscador', () => {
    render(<Header transparent homeNav compact compactSearch={slot} />);
    expect(screen.queryByText('¿Tienes una academia?')).not.toBeInTheDocument();
  });

  it('sin compact los links de negocio siguen visibles', () => {
    render(<Header transparent homeNav compactSearch={slot} />);
    expect(screen.getAllByText('¿Tienes una academia?').length).toBeGreaterThan(0);
  });

  it('compact no afecta al Header de otras páginas (no homeNav)', () => {
    const { container } = render(<Header compactSearch={slot} compact />);
    expect(container.querySelector('header')!.className).toContain('sticky');
    expect(screen.queryByTestId('compact-search')).not.toBeInTheDocument();
  });

  describe('salida animada al volver al hero', () => {
    it('al dejar de ser compacto sigue fija y se desliza hacia arriba antes de volver a absoluta', () => {
      vi.useFakeTimers();
      try {
        const { container, rerender } = render(<Header transparent homeNav compact compactSearch={slot} />);
        rerender(<Header transparent homeNav compact={false} compactSearch={slot} />);

        const header = container.querySelector('header')!;
        expect(header.className).toContain('md:fixed');
        expect(header.className).toContain('animate-header-slide-out');
        expect(screen.getByTestId('compact-search')).toBeInTheDocument();

        act(() => { vi.advanceTimersByTime(400); });

        expect(header.className).toContain('md:absolute');
        expect(header.className).not.toContain('animate-header-slide-out');
        expect(screen.queryByTestId('compact-search')).not.toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it('si vuelve a ser compacto durante la salida, cancela la salida', () => {
      vi.useFakeTimers();
      try {
        const { container, rerender } = render(<Header transparent homeNav compact compactSearch={slot} />);
        rerender(<Header transparent homeNav compact={false} compactSearch={slot} />);
        rerender(<Header transparent homeNav compact compactSearch={slot} />);
        act(() => { vi.advanceTimersByTime(400); });
        const header = container.querySelector('header')!;
        expect(header.className).toContain('md:fixed');
        expect(header.className).not.toContain('animate-header-slide-out');
      } finally {
        vi.useRealTimers();
      }
    });

    it('sin haber sido compacto nunca anima una salida', () => {
      const { container } = render(<Header transparent homeNav compactSearch={slot} />);
      expect(container.querySelector('header')!.className).not.toContain('animate-header-slide-out');
    });
  });

  describe('animaciones definidas en CSS', () => {
    // .animate-header-* son clases CSS normales (no utilidades de Tailwind): con un
    // prefijo como md: no generan nada y la animación nunca corre — bug real que
    // ya pasó, y los tests de clases no lo detectan.
    const header = readFileSync(join(__dirname, 'Header.tsx'), 'utf8');
    const css = readFileSync(join(__dirname, '../app/globals.css'), 'utf8');

    it('toda clase animate-header-* usada por el Header existe en globals.css', () => {
      const used = [...new Set(header.match(/(?<![:\w-])animate-header-[a-z-]+/g) ?? [])];
      expect(used.length).toBeGreaterThan(0);
      for (const cls of used) expect(css).toContain(`.${cls} {`);
    });

    it('el Header no antepone variantes de Tailwind (md:, hover:…) a clases animate-header-*', () => {
      expect(header).not.toMatch(/[a-z]+:animate-header-/);
    });
  });
});
