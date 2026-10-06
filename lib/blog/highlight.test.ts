import { describe, it, expect } from 'vitest';
import { toBlogHighlight } from './highlight';
import type { BlogPost } from './types';

const post = (over: Partial<BlogPost>): BlogPost => ({
  id: '1', slug: 'mi-post', title: 'Mi post', excerpt: 'Resumen', content: '',
  coverImagePosition: '50% 50%', isFeatured: false, status: 'published',
  viewsCount: 0, createdAt: '', updatedAt: '', ...over,
} as BlogPost);

describe('toBlogHighlight', () => {
  it('sin artículos publicados devuelve null (la tarjeta no se muestra)', () => {
    expect(toBlogHighlight([])).toBeNull();
  });

  it('sin ninguno destacado elige el más reciente (la lista ya viene ordenada por fecha)', () => {
    const h = toBlogHighlight([post({ slug: 'nuevo' }), post({ slug: 'viejo' })]);
    expect(h?.slug).toBe('nuevo');
  });

  it('si hay un artículo marcado como destacado, gana aunque no sea el más reciente', () => {
    const h = toBlogHighlight([post({ slug: 'nuevo' }), post({ slug: 'elegido', isFeatured: true }), post({ slug: 'viejo' })]);
    expect(h?.slug).toBe('elegido');
  });

  it('con varios destacados toma el más reciente de ellos (mismo criterio que /blog)', () => {
    const h = toBlogHighlight([post({ slug: 'a' }), post({ slug: 'b', isFeatured: true }), post({ slug: 'c', isFeatured: true })]);
    expect(h?.slug).toBe('b');
  });

  it('solo conserva lo que necesita la tarjeta', () => {
    const h = toBlogHighlight([post({ title: 'T', excerpt: 'E', coverImage: 'c.jpg', category: 'Tendencias', content: 'largo…' })]);
    expect(h).toEqual({
      slug: 'mi-post', title: 'T', excerpt: 'E', coverImage: 'c.jpg', coverImagePosition: '50% 50%', category: 'Tendencias',
    });
  });

  it('un artículo sin título o sin slug no sirve para la tarjeta', () => {
    expect(toBlogHighlight([post({ slug: '' })])).toBeNull();
    expect(toBlogHighlight([post({ title: '  ' })])).toBeNull();
  });
});
