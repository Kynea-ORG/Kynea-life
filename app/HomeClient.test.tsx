// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach } from 'vitest';
import { FeaturedCategoryRow } from './HomeClient';
import type { DanceClass } from '@/lib/types';

vi.mock('@/components/ClassCard', () => ({
  default: ({ cls }: { cls: DanceClass }) => <div data-testid="class-card">{cls.id}</div>,
}));

afterEach(cleanup);

function makeClass(id: string): DanceClass {
  return { id, style: 'Heels' } as DanceClass;
}

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
