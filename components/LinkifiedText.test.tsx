// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import LinkifiedText from './LinkifiedText';

afterEach(cleanup);

describe('LinkifiedText', () => {
  it('renders plain text without links', () => {
    render(<LinkifiedText text="Hola mundo, esto es una prueba." />);
    expect(screen.getByText('Hola mundo, esto es una prueba.')).toBeDefined();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('detects https URLs and renders them with target="_blank"', () => {
    render(<LinkifiedText text="Visita https://www.canva.com/design/123/view para más info." />);
    const link = screen.getByRole('link', { name: 'https://www.canva.com/design/123/view' }) as HTMLAnchorElement;
    expect(link).toBeDefined();
    expect(link.href).toBe('https://www.canva.com/design/123/view');
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
    expect(link.rel).toContain('noreferrer');
  });

  it('handles www URLs by prefixing https://', () => {
    render(<LinkifiedText text="Entra a www.kynea.life hoy mismo." />);
    const link = screen.getByRole('link', { name: 'www.kynea.life' }) as HTMLAnchorElement;
    expect(link).toBeDefined();
    expect(link.href).toBe('https://www.kynea.life/');
    expect(link.target).toBe('_blank');
  });

  it('trims trailing punctuation from URLs', () => {
    render(<LinkifiedText text="Ver portfolio (https://example.com/portfolio)." />);
    const link = screen.getByRole('link', { name: 'https://example.com/portfolio' }) as HTMLAnchorElement;
    expect(link).toBeDefined();
    expect(link.href).toBe('https://example.com/portfolio');
  });

  it('handles multiple URLs in text', () => {
    render(<LinkifiedText text="Link 1: https://a.com y link 2: https://b.com" />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect((links[0] as HTMLAnchorElement).href).toBe('https://a.com/');
    expect((links[1] as HTMLAnchorElement).href).toBe('https://b.com/');
  });

  it('returns null when text is empty or null', () => {
    const { container } = render(<LinkifiedText text={null} />);
    expect(container.firstChild).toBeNull();
  });
});
