// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach } from 'vitest';
import { FeaturedCategoryRow, getMainStyle, type SearchClass } from './HomeClient';
import type { DanceClass } from '@/lib/types';

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
