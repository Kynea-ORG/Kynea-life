// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import HomeFeatureCards from './HomeFeatureCards';

afterEach(cleanup);

const post = { slug: 'los-5-estilos', title: 'Los 5 estilos de baile', excerpt: 'Resumen', coverImagePosition: '50% 50%', category: 'Tendencias' };

describe('HomeFeatureCards', () => {
  it('muestra las dos tarjetas en una misma sección: profesoras a la izquierda, blog a la derecha', () => {
    const { container } = render(<HomeFeatureCards womenClassCount={4} blogHighlight={post} />);
    expect(container.querySelectorAll('section')).toHaveLength(1);
    const cards = container.querySelectorAll('article');
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('Clases con profesoras mujeres');
    expect(cards[1].textContent).toContain('Los 5 estilos de baile');
  });

  it('en pantallas medianas o grandes son dos columnas del mismo alto', () => {
    const { container } = render(<HomeFeatureCards womenClassCount={4} blogHighlight={post} />);
    const grid = container.querySelector('section > div > div')!;
    expect(grid.className).toContain('md:grid-cols-2');
  });

  it('si solo hay profesoras, la tarjeta ocupa todo el ancho', () => {
    const { container } = render(<HomeFeatureCards womenClassCount={4} blogHighlight={null} />);
    expect(container.querySelectorAll('article')).toHaveLength(1);
    expect(container.querySelector('section > div > div')!.className).not.toContain('md:grid-cols-2');
  });

  it('si solo hay blog, muestra únicamente el blog', () => {
    render(<HomeFeatureCards womenClassCount={null} blogHighlight={post} />);
    expect(screen.queryByText('Clases con profesoras mujeres')).not.toBeInTheDocument();
    expect(screen.getByText('Los 5 estilos de baile')).toBeInTheDocument();
  });

  it('sin ninguna de las dos no renderiza nada', () => {
    const { container } = render(<HomeFeatureCards womenClassCount={null} blogHighlight={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
