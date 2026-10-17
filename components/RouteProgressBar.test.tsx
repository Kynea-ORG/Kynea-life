// @vitest-environment jsdom
/* eslint-disable @next/next/no-html-link-for-pages */
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RouteProgressBar from './RouteProgressBar';
import { startRouteProgress, stopRouteProgress } from '@/lib/navigation/progress';

const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => {
  return {
    usePathname: () => '/test-current',
    useSearchParams: () => mockSearchParams,
  };
});

describe('RouteProgressBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('no muestra la barra cuando está inactiva', () => {
    render(<RouteProgressBar />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('inicia y muestra la barra al llamar a startRouteProgress()', () => {
    render(<RouteProgressBar />);

    act(() => {
      startRouteProgress();
    });

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(Number(progressBar.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
  });

  it('avanza progresivamente con el trickle timer', () => {
    render(<RouteProgressBar />);

    act(() => {
      startRouteProgress();
    });

    const progressBar = screen.getByRole('progressbar');
    const initialVal = Number(progressBar.getAttribute('aria-valuenow'));

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const nextVal = Number(progressBar.getAttribute('aria-valuenow'));
    expect(nextVal).toBeGreaterThan(initialVal);
  });

  it('completa al 100% y se desvanece al llamar a stopRouteProgress()', () => {
    render(<RouteProgressBar />);

    act(() => {
      startRouteProgress();
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    act(() => {
      stopRouteProgress();
    });

    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('100');

    // Tras los timeouts de fade-out y reset, se desmonta
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('se activa al hacer clic en un enlace interno válido', () => {
    render(
      <div>
        <RouteProgressBar />
        <a href="/clases" data-testid="internal-link">
          Ver clases
        </a>
      </div>
    );

    const link = screen.getByTestId('internal-link');

    act(() => {
      fireEvent.click(link);
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('ignora enlaces externos, target="_blank", hashes y modificadores de teclado', () => {
    render(
      <div>
        <RouteProgressBar />
        <a href="https://google.com" data-testid="ext-link">Google</a>
        <a href="/clases" target="_blank" data-testid="blank-link">Blank</a>
        <a href="#seccion" data-testid="hash-link">Hash</a>
        <a href="/clases" download data-testid="download-link">Download</a>
      </div>
    );

    act(() => {
      fireEvent.click(screen.getByTestId('ext-link'));
      fireEvent.click(screen.getByTestId('blank-link'));
      fireEvent.click(screen.getByTestId('hash-link'));
      fireEvent.click(screen.getByTestId('download-link'));
    });

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

    // Con Cmd/Ctrl presionado tampoco debe dispararse
    act(() => {
      fireEvent.click(screen.getByTestId('ext-link'), { metaKey: true });
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
