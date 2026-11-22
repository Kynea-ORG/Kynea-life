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
  DashboardReservasSkeleton,
  DashboardMisReservasSkeleton,
  DashboardWizardSkeleton,
  DashboardImportCsvSkeleton,
  DashboardPerfilSkeleton,
  DashboardConfiguracionSkeleton,
  DashboardContactosSkeleton,
  DashboardProfesoresSkeleton,
  AdminResumenSkeleton,
  AdminTableSkeleton,
  AdminProfesorasSkeleton,
  AdminCrearUsuarioSkeleton,
  AdminBlogListSkeleton,
  AdminBlogEditorSkeleton,
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

  it('renders DashboardReservasSkeleton with max-w-6xl master-detail layout, pill tabs and no circular avatars', () => {
    const { container } = render(<DashboardReservasSkeleton />);
    const root = container.querySelector('[aria-busy="true"]');
    expect(root).not.toBeNull();
    expect(root?.getAttribute('aria-label')).toBe('Cargando reservas recibidas...');
    expect(root?.className).toContain('max-w-6xl');
    expect(container.querySelector('.lg\\:grid-cols-\\[360px_1fr\\]')).not.toBeNull();
    expect(container.querySelector('.w-24.h-1\\.5')).not.toBeNull();
    expect(container.querySelector('.w-10.h-10.rounded-full')).toBeNull();
  });

  it('renders DashboardMisReservasSkeleton with max-w-5xl container and aria-busy', () => {
    const { container } = render(<DashboardMisReservasSkeleton />);
    const root = container.querySelector('[aria-busy="true"]');
    expect(root).not.toBeNull();
    expect(root?.getAttribute('aria-label')).toBe('Cargando mis reservas...');
    expect(root?.className).toContain('max-w-5xl');
  });

  it('renders DashboardWizardSkeleton with wizard shell header, body and footer', () => {
    const { container } = render(<DashboardWizardSkeleton />);
    const root = container.querySelector('[aria-busy="true"]');
    expect(root).not.toBeNull();
    expect(root?.getAttribute('aria-label')).toBe('Cargando formulario de clase...');
    expect(container.querySelector('header')).not.toBeNull();
    expect(container.querySelector('footer')).not.toBeNull();
  });

  it('renders DashboardImportCsvSkeleton with max-w-4xl container', () => {
    const { container } = render(<DashboardImportCsvSkeleton />);
    const root = container.querySelector('[aria-busy="true"]');
    expect(root).not.toBeNull();
    expect(root?.className).toContain('max-w-4xl');
  });

  it('renders DashboardPerfilSkeleton with max-w-3xl container', () => {
    const { container } = render(<DashboardPerfilSkeleton />);
    const root = container.querySelector('[aria-busy="true"]');
    expect(root).not.toBeNull();
    expect(root?.className).toContain('max-w-3xl');
  });

  it('renders DashboardConfiguracionSkeleton with max-w-3xl container', () => {
    const { container } = render(<DashboardConfiguracionSkeleton />);
    const root = container.querySelector('[aria-busy="true"]');
    expect(root).not.toBeNull();
    expect(root?.className).toContain('max-w-3xl');
  });

  it('renders DashboardContactosSkeleton with max-w-4xl container', () => {
    const { container } = render(<DashboardContactosSkeleton />);
    const root = container.querySelector('[aria-busy="true"]');
    expect(root).not.toBeNull();
    expect(root?.className).toContain('max-w-4xl');
  });

  it('renders DashboardProfesoresSkeleton with max-w-3xl container', () => {
    const { container } = render(<DashboardProfesoresSkeleton />);
    const root = container.querySelector('[aria-busy="true"]');
    expect(root).not.toBeNull();
    expect(root?.className).toContain('max-w-3xl');
  });

  it('renders AdminResumenSkeleton with 3 sections, max-w-6xl container and top 5 rows', () => {
    const { container } = render(<AdminResumenSkeleton />);
    const root = container.querySelector('[aria-busy="true"]');
    expect(root).not.toBeNull();
    expect(root?.getAttribute('aria-label')).toBe('Cargando resumen de administración...');
    expect(root?.className).toContain('max-w-6xl');
    expect(container.querySelectorAll('section')).toHaveLength(3);
    expect(container.querySelectorAll('ul > li')).toHaveLength(5);
  });

  it('renders AdminTableSkeleton for usuarios and academias variants', () => {
    const { container: usuarios } = render(
      <AdminTableSkeleton ariaLabel="Cargando usuarios..." showAction showPagination />,
    );
    expect(usuarios.querySelector('[aria-label="Cargando usuarios..."]')).not.toBeNull();

    const { container: academias } = render(
      <AdminTableSkeleton ariaLabel="Cargando solicitudes de academia..." withRowActions />,
    );
    expect(academias.querySelector('[aria-label="Cargando solicitudes de academia..."]')).not.toBeNull();
  });

  it('renders AdminProfesorasSkeleton with max-w-4xl container', () => {
    const { container } = render(<AdminProfesorasSkeleton />);
    const root = container.querySelector('[aria-busy="true"]');
    expect(root).not.toBeNull();
    expect(root?.className).toContain('max-w-4xl');
  });

  it('renders AdminCrearUsuarioSkeleton with max-w-2xl container', () => {
    const { container } = render(<AdminCrearUsuarioSkeleton />);
    const root = container.querySelector('[aria-busy="true"]');
    expect(root).not.toBeNull();
    expect(root?.className).toContain('max-w-2xl');
  });

  it('renders AdminBlogListSkeleton with aria-busy', () => {
    const { container } = render(<AdminBlogListSkeleton />);
    const root = container.querySelector('[aria-busy="true"]');
    expect(root).not.toBeNull();
    expect(root?.getAttribute('aria-label')).toBe('Cargando artículos del blog...');
  });

  it('renders AdminBlogEditorSkeleton with aria-busy', () => {
    const { container } = render(<AdminBlogEditorSkeleton />);
    const root = container.querySelector('[aria-busy="true"]');
    expect(root).not.toBeNull();
    expect(root?.getAttribute('aria-label')).toBe('Cargando editor de artículo...');
  });
});
