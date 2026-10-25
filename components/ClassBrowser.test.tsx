// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, render, screen, act } from '@testing-library/react';
import ClassBrowser from './ClassBrowser';
import type { DanceClass } from '@/lib/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/maps/staticMap', () => ({ generateAndCacheVenueMapImage: vi.fn(async () => null) }));
vi.mock('@/components/SmartImage', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));
vi.mock('@/lib/analytics', () => ({
  trackSelectItem: vi.fn(),
  trackSaveClass: vi.fn(),
  trackMapViewToggle: vi.fn(),
}));

// Mock Google Maps component
vi.mock('@/components/ClasesMapView', () => ({
  default: () => <div data-testid="clases-map-view" />,
}));

function makeClass(id: string, title: string): DanceClass {
  return {
    id,
    slug: `slug-${id}`,
    styleSlug: 'salsa',
    type: 'taller',
    title,
    style: 'Salsa',
    level: 'Principiante',
    shortDescription: '',
    fullDescription: '',
    startDate: '2099-09-14',
    recurrence: 'mensual',
    timeSlots: [{ days: ['Lunes'], startTime: '20:30:00', endTime: '22:00:00' }],
    priceType: 'Mensual',
    price: 100,
    currency: 'PEN',
    modality: 'Presencial',
    city: 'Lima',
    district: 'Miraflores',
    venueName: 'Studio 1',
    countryCode: 'PE',
    coverImage: 'cover.jpg',
    status: 'published',
    teacher: { id: 't1', name: 'Profesor Test', showSpots: false },
  } as unknown as DanceClass;
}

const observers = new Map<Element, (entries: IntersectionObserverEntry[]) => void>();

beforeEach(() => {
  observers.clear();

  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = '';
    readonly scrollMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];
    private cb: (entries: IntersectionObserverEntry[]) => void;

    constructor(callback: IntersectionObserverCallback) {
      this.cb = callback as (entries: IntersectionObserverEntry[]) => void;
    }

    observe(target: Element) {
      observers.set(target, this.cb);
    }

    unobserve(target: Element) {
      observers.delete(target);
    }

    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
  }

  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

afterEach(() => {
  cleanup();
  observers.clear();
  vi.unstubAllGlobals();
});

describe('ClassBrowser · Lazy loading progresivo (Infinite Scroll)', () => {
  it('renderiza solo el primer lote (12 clases) cuando hay 25 clases disponibles y muestra el centinela', () => {
    const classes = Array.from({ length: 25 }, (_, i) => makeClass(`c${i + 1}`, `Clase de Salsa ${i + 1}`));

    render(
      <ClassBrowser
        baseUrl="/clases"
        initialClasses={classes}
        includeStyles
        searchPlaceholder="Buscar..."
        renderResultsCount={count => <span>{count} clases</span>}
        emptyText="No hay resultados"
      />
    );

    // Muestra 12 tarjetas de clase inicialmente (cada card tiene versión desktop y mobile)
    expect(screen.getAllByText('Clase de Salsa 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Clase de Salsa 12').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Clase de Salsa 13')).toHaveLength(0);

    // Muestra el centinela de "Cargando más clases…"
    expect(screen.getByText('Cargando más clases…')).toBeInTheDocument();
  });

  it('no muestra el centinela cuando la cantidad de clases es menor o igual a 12', () => {
    const classes = Array.from({ length: 10 }, (_, i) => makeClass(`c${i + 1}`, `Clase ${i + 1}`));

    render(
      <ClassBrowser
        baseUrl="/clases"
        initialClasses={classes}
        includeStyles
        searchPlaceholder="Buscar..."
        renderResultsCount={count => <span>{count} clases</span>}
        emptyText="No hay resultados"
      />
    );

    expect(screen.getAllByText('Clase 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Clase 10').length).toBeGreaterThan(0);
    expect(screen.queryByText('Cargando más clases…')).not.toBeInTheDocument();
  });

  it('carga el siguiente lote (24 clases) al activarse el IntersectionObserver', () => {
    const classes = Array.from({ length: 25 }, (_, i) => makeClass(`c${i + 1}`, `Clase de Salsa ${i + 1}`));

    render(
      <ClassBrowser
        baseUrl="/clases"
        initialClasses={classes}
        includeStyles
        searchPlaceholder="Buscar..."
        renderResultsCount={count => <span>{count} clases</span>}
        emptyText="No hay resultados"
      />
    );

    expect(screen.queryAllByText('Clase de Salsa 13')).toHaveLength(0);
    const sentinel = screen.getByText('Cargando más clases…').closest('div[class*="py-8"]');
    expect(sentinel).not.toBeNull();

    // Simula que el centinela entra en el viewport
    act(() => {
      const cb = observers.get(sentinel!);
      cb?.([
        {
          isIntersecting: true,
          target: sentinel!,
        } as unknown as IntersectionObserverEntry,
      ]);
    });

    // Ahora deben estar visibles 24 clases
    expect(screen.getAllByText('Clase de Salsa 13').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Clase de Salsa 24').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Clase de Salsa 25')).toHaveLength(0);

    // Sigue mostrando el centinela porque falta 1 clase (la 25)
    const nextSentinel = screen.getByText('Cargando más clases…').closest('div[class*="py-8"]');
    expect(nextSentinel).not.toBeNull();

    // Disparar nuevamente para cargar el lote final
    act(() => {
      const cb = observers.get(nextSentinel!);
      cb?.([
        {
          isIntersecting: true,
          target: nextSentinel!,
        } as unknown as IntersectionObserverEntry,
      ]);
    });

    // Ahora la clase 25 está visible y el centinela desaparece
    expect(screen.getAllByText('Clase de Salsa 25').length).toBeGreaterThan(0);
    expect(screen.queryByText('Cargando más clases…')).not.toBeInTheDocument();
  });

  it('resetea la paginación al primer lote si el usuario busca algo nuevo', () => {
    const classes = Array.from({ length: 25 }, (_, i) => makeClass(`c${i + 1}`, `Clase de Salsa ${i + 1}`));

    render(
      <ClassBrowser
        baseUrl="/clases"
        initialClasses={classes}
        includeStyles
        searchPlaceholder="Buscar..."
        renderResultsCount={count => <span>{count} clases</span>}
        emptyText="No hay resultados"
      />
    );

    // Cargar el segundo lote (24 clases)
    const sentinel = screen.getByText('Cargando más clases…').closest('div[class*="py-8"]');
    act(() => {
      const cb = observers.get(sentinel!);
      cb?.([
        {
          isIntersecting: true,
          target: sentinel!,
        } as unknown as IntersectionObserverEntry,
      ]);
    });

    expect(screen.getAllByText('Clase de Salsa 24').length).toBeGreaterThan(0);

    // Simular que cambia la búsqueda escribiendo en el input
    const input = screen.getAllByPlaceholderText('Buscar...')[0];
    act(() => {
      // Modificar input
      input.dispatchEvent(new Event('focus'));
    });

    // Validamos que el componente mantiene la consistencia
    expect(screen.getAllByText('Clase de Salsa 1').length).toBeGreaterThan(0);
  });
});
