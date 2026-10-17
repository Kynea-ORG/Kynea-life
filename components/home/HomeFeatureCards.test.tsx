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

  it('en mobile es un slider horizontal con snap; desde md vuelve a dos columnas', () => {
    const { container } = render(<HomeFeatureCards womenClassCount={4} blogHighlight={post} />);
    const track = container.querySelector('section > div > div')!;
    expect(track.className).toContain('overflow-x-auto');
    expect(track.className).toContain('snap-x');
    expect(track.className).toContain('md:grid');
    expect(track.className).toContain('md:overflow-visible');
  });

  it('cada tarjeta ocupa casi todo el ancho en mobile para dejar asomar la siguiente', () => {
    const { container } = render(<HomeFeatureCards womenClassCount={4} blogHighlight={post} />);
    const items = container.querySelectorAll('section > div > div > div');
    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(item.className).toContain('snap-start');
      expect(item.className).toContain('shrink-0');
      expect(item.className).toMatch(/w-\[\d+%\]/);
      expect(item.className).toContain('md:w-auto');
    }
  });

  it('con una sola tarjeta no hay slider', () => {
    const { container } = render(<HomeFeatureCards womenClassCount={4} blogHighlight={null} />);
    expect(container.querySelector('section > div > div')!.className).not.toContain('overflow-x-auto');
  });
});
