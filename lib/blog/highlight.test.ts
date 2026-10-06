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

  it('elige el más reciente (la lista ya viene ordenada por fecha)', () => {
    const h = toBlogHighlight([post({ slug: 'nuevo' }), post({ slug: 'viejo' })]);
    expect(h?.slug).toBe('nuevo');
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
