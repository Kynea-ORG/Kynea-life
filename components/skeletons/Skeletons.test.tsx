// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import {
  ClassCardSkeleton,
  ClasesCatalogSkeleton,
  ClaseDetailSkeleton,
  ProfesorProfileSkeleton,
  DirectoryGridSkeleton,
  DashboardTableSkeleton,
  DashboardOverviewSkeleton,
  CategoriasSkeleton,
  BlogSkeleton,
  BlogPostSkeleton,
} from './index';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({ profile: null, loading: false, signOut: vi.fn() }),
}));

describe('Contextual Skeletons', () => {
  afterEach(cleanup);

  it('renders ClassCardSkeleton for desktop and mobile layouts', () => {
    const { container: desktop } = render(<ClassCardSkeleton mobileLayout="carousel" />);
    expect(desktop.querySelector('[aria-busy="true"]')).toBeDefined();

    const { container: row } = render(<ClassCardSkeleton mobileLayout="row" />);
    expect(row.querySelector('[aria-busy="true"]')).toBeDefined();
  });

  it('renders ClasesCatalogSkeleton with aria-busy="true"', () => {
    const { container } = render(<ClasesCatalogSkeleton />);
    expect(container.querySelector('[aria-busy="true"]')).toBeDefined();
    expect(container.querySelector('[aria-label="Cargando catálogo de clases..."]')).toBeDefined();
  });

  it('renders ClaseDetailSkeleton with aria-busy="true"', () => {
    const { container } = render(<ClaseDetailSkeleton />);
    expect(container.querySelector('[aria-busy="true"]')).toBeDefined();
    expect(container.querySelector('[aria-label="Cargando detalle de la clase..."]')).toBeDefined();
  });

  it('renders ProfesorProfileSkeleton with dark theme background', () => {
    const { container } = render(<ProfesorProfileSkeleton />);
    const root = container.querySelector('[aria-busy="true"]');
    expect(root).toBeDefined();
    expect(root?.className).toContain('bg-neutral-900');
  });

  it('renders DirectoryGridSkeleton with search bar and cards', () => {
    const { container } = render(<DirectoryGridSkeleton title="Profesores" />);
    expect(container.querySelector('[aria-busy="true"]')).toBeDefined();
    expect(container.querySelector('[aria-label="Cargando directorio..."]')).toBeDefined();
  });

  it('renders DashboardTableSkeleton with proper column count', () => {
    const { container } = render(<DashboardTableSkeleton />);
    expect(container.querySelector('[aria-busy="true"]')).toBeDefined();
  });

  it('renders DashboardOverviewSkeleton with metrics strip', () => {
    const { container } = render(<DashboardOverviewSkeleton />);
    expect(container.querySelector('[aria-busy="true"]')).toBeDefined();
  });

  it('renders CategoriasSkeleton with featured and regular grids', () => {
    const { container } = render(<CategoriasSkeleton />);
    expect(container.querySelector('[aria-busy="true"]')).toBeDefined();
  });

  it('renders BlogSkeleton with categories and article cards', () => {
    const { container } = render(<BlogSkeleton />);
    expect(container.querySelector('[aria-busy="true"]')).toBeDefined();
  });

  it('renders BlogPostSkeleton with article layout and sidebar', () => {
    const { container } = render(<BlogPostSkeleton />);
    expect(container.querySelector('[aria-busy="true"]')).toBeDefined();
    expect(container.querySelector('[aria-label="Cargando artículo..."]')).toBeDefined();
  });
});
