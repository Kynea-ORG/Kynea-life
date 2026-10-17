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

    // Dos accesos: el enlace de la cabecera y, solo en mobile, la tarjeta final del carrusel.
    const links = screen.getAllByRole('link', { name: /Ver todas/ });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute('href', `/clases?style=${encodeURIComponent('Contemporáneo')}`);
    }
  });

  it('el carrusel termina con una tarjeta "Ver todas las clases" solo para mobile', () => {
    render(<FeaturedCategoryRow style="Heels" classes={[makeClass('1')]} />);

    const tile = screen.getByRole('link', { name: 'Ver todas las clases' });
    expect(tile.className).toContain('md:hidden');
  });
});

describe('HomeClient AI Search Default Experience', () => {
  const defaultProps = {
    danceStylesWithClasses: [{ id: 1, name: 'Salsa', slug: 'salsa', emoji: '💃' }],
    recommendedClasses: [],
    featuredCategories: [],
    initialTeachers: [],
    initialAcademias: [],
    danceStyles: [{ id: 1, name: 'Salsa', slug: 'salsa', emoji: '💃' }],
    stats: { classes: 10, teachers: 5, styles: 1, cities: 1, cityNames: ['Lima'] },
    userRole: null as null,
  };

  it('renders with intelligent AI search as the default experience with Descubrir button', async () => {
    const { default: HomeClient } = await import('./HomeClient');
    render(<HomeClient {...defaultProps} />);

    // In default AI mode, classic city search input is not rendered
    expect(screen.queryByPlaceholderText('¿Dónde bailas?')).not.toBeInTheDocument();

    // Mode toggle button is eliminated
    expect(screen.queryByRole('button', { name: /Modo IA/i })).not.toBeInTheDocument();

    // Submit button says Buscar
    const submitButtons = screen.getAllByRole('button', { name: /Buscar/i });
    expect(submitButtons.length).toBeGreaterThan(0);

    // Micro-label is present
    expect(screen.getAllByText('¿Qué tienes ganas de bailar?').length).toBeGreaterThan(0);

    // Búsqueda inteligente suggestions header is present
    expect(screen.getByText(/Búsqueda inteligente, prueba sugerencias como:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salsa o bachata este fin de semana/i })).toBeInTheDocument();

    // Typing in the search input updates value and submits via router
    const { fireEvent } = await import('@testing-library/react');
    const input = screen.getAllByRole('textbox')[0];
    fireEvent.change(input, { target: { value: 'salsa en Miraflores' } });
    expect(input).toHaveValue('salsa en Miraflores');

    fireEvent.click(submitButtons[0]);
    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('salsa+en+Miraflores'));
  });
});

