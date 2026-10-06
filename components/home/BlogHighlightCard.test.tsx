// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import BlogHighlightCard from './BlogHighlightCard';

afterEach(cleanup);

const post = {
  slug: 'los-5-estilos',
  title: 'Los 5 estilos de baile que están marcando Latinoamérica',
  excerpt: 'Una mirada a lo que se baila hoy.',
  coverImage: 'https://example.com/cover.jpg',
  coverImagePosition: '50% 50%',
  category: 'Tendencias',
};

describe('BlogHighlightCard', () => {
  it('invita a leer el blog con el título del último artículo', () => {
    render(<BlogHighlightCard post={post} />);
    expect(screen.getByText('Del blog de Kynea')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: post.title })).toBeInTheDocument();
    expect(screen.getByText(post.excerpt)).toBeInTheDocument();
    expect(screen.getByText('Tendencias')).toBeInTheDocument();
  });

  it('el botón principal lleva al artículo y hay un enlace secundario al blog', () => {
    render(<BlogHighlightCard post={post} />);
    expect(screen.getByRole('link', { name: /Leer artículo/ })).toHaveAttribute('href', '/blog/los-5-estilos');
    expect(screen.getByRole('link', { name: /Ver todo el blog/ })).toHaveAttribute('href', '/blog');
  });

  it('el título también es un enlace al artículo (toda la tarjeta es clicable)', () => {
    render(<BlogHighlightCard post={post} />);
    const links = screen.getAllByRole('link').map(l => l.getAttribute('href'));
    expect(links.filter(h => h === '/blog/los-5-estilos').length).toBeGreaterThanOrEqual(1);
  });

  it('sin portada ni categoría ni resumen igual se ve bien', () => {
    render(<BlogHighlightCard post={{ slug: 'a', title: 'Solo título', excerpt: '', coverImagePosition: '50% 50%' }} />);
    expect(screen.getByRole('heading', { name: 'Solo título' })).toBeInTheDocument();
    expect(screen.queryByText('Tendencias')).not.toBeInTheDocument();
  });
});
