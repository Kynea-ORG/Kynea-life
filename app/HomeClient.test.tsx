// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach } from 'vitest';
import { FeaturedCategoryRow, getMainStyle, type SearchClass } from './HomeClient';
import type { DanceClass } from '@/lib/types';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/components/ClassCard', () => ({
  default: ({ cls }: { cls: DanceClass }) => <div data-testid="class-card">{cls.id}</div>,
}));

afterEach(cleanup);

function makeClass(id: string): DanceClass {
  return { id, style: 'Heels' } as DanceClass;
}

describe('getMainStyle', () => {
  it('returns the style marked as is_main', () => {
    const cls: SearchClass = {
      id: '1',
      slug: 'clase-salsa',
      title: 'Clase de Salsa',
      type: 'clase',
      class_styles: [
        { is_main: false, dance_styles: { name: 'Bachata', slug: 'bachata' } },
        { is_main: true, dance_styles: { name: 'Salsa', slug: 'salsa' } },
      ],
    };
    expect(getMainStyle(cls)).toEqual({ name: 'Salsa', slug: 'salsa' });
  });

  it('falls back to the first style when none is marked is_main', () => {
    const cls: SearchClass = {
      id: '2',
      slug: 'clase-urbano',
      title: 'Clase de Urbano',
      type: 'taller',
      class_styles: [
        { is_main: false, dance_styles: { name: 'Urbano', slug: 'urbano' } },
      ],
    };
    expect(getMainStyle(cls)).toEqual({ name: 'Urbano', slug: 'urbano' });
  });

  it('returns null when class_styles is null or empty', () => {
    const cls: SearchClass = {
      id: '3',
      slug: 'clase-sin-estilos',
      title: 'Sin Estilos',
      type: 'clase',
      class_styles: [],
    };
    expect(getMainStyle(cls)).toBeNull();
  });
});

describe('FeaturedCategoryRow', () => {
  it('renders nothing when there are no classes for the style', () => {
    const { container } = render(<FeaturedCategoryRow style="Heels" classes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the style heading and one card per class', () => {
    render(<FeaturedCategoryRow style="Heels" classes={[makeClass('1'), makeClass('2')]} />);

    expect(screen.getByRole('heading', { name: 'Heels' })).toBeInTheDocument();
    expect(screen.getAllByTestId('class-card')).toHaveLength(2);
  });

  it('links "Ver todas" to the style-filtered classes page', () => {
    render(<FeaturedCategoryRow style="Contemporáneo" classes={[makeClass('1')]} />);

    const link = screen.getByRole('link', { name: /Ver todas/ });
    expect(link).toHaveAttribute('href', `/clases?style=${encodeURIComponent('Contemporáneo')}`);
  });
});

describe('HomeClient AI Search Mode Toggle', () => {
  const defaultProps = {
    initialClasses: [],
    recommendedClasses: [],
    featuredCategories: [],
    initialTeachers: [],
    initialAcademias: [],
    danceStyles: [{ id: 1, name: 'Salsa', slug: 'salsa', emoji: '💃' }],
    stats: { classes: 10, teachers: 5, styles: 1, cities: 1, cityNames: ['Lima'] },
    userRole: null as null,
  };

  it('renders with Modo IA active by default and toggles to classic mode on click', async () => {
    const { default: HomeClient } = await import('./HomeClient');
    render(<HomeClient {...defaultProps} />);

    // In AI mode, search buttons say "Buscar con IA"
    const searchButtons = screen.getAllByRole('button', { name: /Buscar con IA/i });
    expect(searchButtons.length).toBeGreaterThan(0);

    // In AI mode, city search input is not rendered
    expect(screen.queryByPlaceholderText('¿Dónde bailas?')).not.toBeInTheDocument();

    // Toggle button exists
    const toggleButtons = screen.getAllByRole('button', { name: /Modo IA activado/i });
    expect(toggleButtons.length).toBeGreaterThan(0);

    // Click toggle to switch to classic mode
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.click(toggleButtons[0]);

    // Now it should show "Buscar" instead of "Buscar con IA"
    expect(screen.queryAllByRole('button', { name: /^Buscar$/i }).length).toBeGreaterThan(0);

    // In classic mode, city input is rendered
    expect(screen.getByPlaceholderText('¿Dónde bailas?')).toBeInTheDocument();
  });
});

