// lib/ai/relaxations.test.ts
import { describe, it, expect, vi } from 'vitest';
import { findRelaxations } from './relaxations';
import type { AiSearchFilters } from './types';

const filters: AiSearchFilters = { style: 'Salsa', district: 'Barranco', daysOfWeek: [5] };

// Simula un catálogo: cuántas clases devuelve cada combinación de filtros.
function fakeSearch(table: (f: AiSearchFilters, city?: string, tags?: string[]) => number) {
  return vi.fn(async (o: { city?: string; filters: AiSearchFilters; tags: string[] }) =>
    table(o.filters, o.city, o.tags));
}

describe('findRelaxations', () => {
  it('propone quitar cada filtro que sí devuelve clases, ordenado por cantidad', async () => {
    const search = fakeSearch(f => (!f.daysOfWeek ? 4 : !f.district ? 9 : 0));
    const r = await findRelaxations({ query: 'salsa sábados en Barranco', filters, tags: [], search });
    expect(r.map(x => [x.label, x.count])).toEqual([
      ['Barranco', 9],
      ['Sáb', 4],
    ]);
  });

  it('descarta las opciones sin resultados', async () => {
    const r = await findRelaxations({ query: 'q', filters, tags: [], search: fakeSearch(() => 0) });
    expect(r).toEqual([]);
  });

  it('el href conserva los demás filtros y marca el refinamiento (r=1)', async () => {
    const search = fakeSearch(f => (!f.daysOfWeek ? 4 : 0));
    const [r] = await findRelaxations({ query: 'salsa', filters, tags: ['Fin de semana'], search });
    const p = new URL(r.href, 'http://x').searchParams;
    expect(p.get('r')).toBe('1');
    expect(p.get('style')).toBe('Salsa');
    expect(p.get('district')).toBe('Barranco');
    expect(p.get('days')).toBeNull();
    expect(p.get('tags')).toBe('Fin de semana');
  });

  it('puede quitar un tag', async () => {
    const search = fakeSearch((_f, _c, tags) => (tags?.length ? 0 : 5));
    const r = await findRelaxations({ query: 'q', filters: { style: 'Salsa' }, tags: ['Económico'], search });
    expect(r.map(x => x.label)).toEqual(['Económico']);
  });

  it('si hay ciudad, ofrece buscar fuera de ella', async () => {
    const search = fakeSearch((_f, city) => (city ? 0 : 7));
    const r = await findRelaxations({ query: 'q', city: 'Lima', filters: { style: 'Salsa' }, tags: [], search });
    const outside = r.find(x => x.kind === 'city');
    expect(outside).toMatchObject({ label: 'Lima', count: 7 });
    expect(new URL(outside!.href, 'http://x').searchParams.get('city')).toBeNull();
  });

  it('respeta el máximo', async () => {
    const many: AiSearchFilters = { style: 'A', district: 'B', level: 'C', modality: 'Online', maxPrice: 10 };
    const r = await findRelaxations({ query: 'q', filters: many, tags: [], search: fakeSearch(() => 3), max: 2 });
    expect(r).toHaveLength(2);
  });

  it('un error en una consulta no tumba las demás', async () => {
    let n = 0;
    const search = vi.fn(async () => {
      if (n++ === 0) throw new Error('boom');
      return 6;
    });
    const r = await findRelaxations({ query: 'q', filters, tags: [], search });
    expect(r.length).toBe(2);
  });

  it('sin filtros ni ciudad no consulta nada', async () => {
    const search = fakeSearch(() => 1);
    expect(await findRelaxations({ query: 'q', filters: {}, tags: [], search })).toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });
});
