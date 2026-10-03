// lib/ai/filterParams.test.ts
import { describe, it, expect } from 'vitest';
import {
  parseFilterParams,
  buildRefinementHref,
  buildFilterChips,
  removeChip,
} from './filterParams';
import type { AiSearchFilters } from './types';

describe('parseFilterParams', () => {
  it('no marca refinamiento cuando solo viene q', () => {
    const r = parseFilterParams({ q: 'salsa' });
    expect(r.refined).toBe(false);
    expect(r.filters).toEqual({});
    expect(r.tags).toEqual([]);
  });

  it('marca refinamiento con r=1 aunque no haya filtros', () => {
    expect(parseFilterParams({ q: 'salsa', r: '1' }).refined).toBe(true);
  });

  it('lee filtros válidos', () => {
    const r = parseFilterParams({
      q: 'x', r: '1', style: 'Salsa', district: 'Miraflores', price: '50',
      days: '5,6', modality: 'Online', level: 'Principiante', age: 'Niños', time: 'evening',
      tags: 'Para niños,Fin de semana',
    });
    expect(r.filters).toEqual({
      style: 'Salsa', district: 'Miraflores', maxPrice: 50, daysOfWeek: [5, 6],
      modality: 'Online', level: 'Principiante', ageGroup: 'Niños', timeOfDay: 'evening',
    });
    expect(r.tags).toEqual(['Para niños', 'Fin de semana']);
  });

  it('descarta valores inválidos', () => {
    const r = parseFilterParams({
      q: 'x', r: '1', price: '-3', days: '9,abc,2', modality: 'Hibrido', time: 'madrugada', style: '   ',
    });
    expect(r.filters).toEqual({ daysOfWeek: [2] });
  });

  it('toma el primer valor si el parámetro viene repetido', () => {
    expect(parseFilterParams({ q: 'x', r: '1', style: ['Salsa', 'Bachata'] }).filters.style).toBe('Salsa');
  });
});

describe('buildRefinementHref', () => {
  it('siempre incluye q y r=1, y omite filtros vacíos', () => {
    expect(buildRefinementHref('salsa', undefined, {}, [])).toBe('/resultados?q=salsa&r=1');
  });

  it('conserva city y serializa filtros', () => {
    const filters: AiSearchFilters = { style: 'Salsa', maxPrice: 40, daysOfWeek: [5, 6] };
    const href = buildRefinementHref('salsa sábados', 'Lima', filters, ['Económico']);
    const p = new URL(href, 'http://x').searchParams;
    expect(p.get('q')).toBe('salsa sábados');
    expect(p.get('city')).toBe('Lima');
    expect(p.get('r')).toBe('1');
    expect(p.get('style')).toBe('Salsa');
    expect(p.get('price')).toBe('40');
    expect(p.get('days')).toBe('5,6');
    expect(p.get('tags')).toBe('Económico');
  });

  it('hace round-trip con parseFilterParams', () => {
    const filters: AiSearchFilters = { style: 'Salsa', district: 'Lince', timeOfDay: 'morning', level: 'Intermedio' };
    const p = new URL(buildRefinementHref('q', undefined, filters, ['A', 'B']), 'http://x').searchParams;
    const parsed = parseFilterParams(Object.fromEntries(p.entries()));
    expect(parsed.filters).toEqual(filters);
    expect(parsed.tags).toEqual(['A', 'B']);
  });
});

describe('buildFilterChips', () => {
  it('genera un chip por filtro, uno por tag y uno para el grupo de días', () => {
    const chips = buildFilterChips(
      { style: 'Salsa', district: 'Miraflores', maxPrice: 50, daysOfWeek: [5, 6], timeOfDay: 'evening' },
      ['Para niños'],
    );
    expect(chips.map(c => c.label)).toEqual([
      'Salsa', 'Miraflores', 'Hasta S/ 50', 'Sáb, Dom', 'Noche', 'Para niños',
    ]);
  });

  it('devuelve vacío sin filtros', () => {
    expect(buildFilterChips({}, [])).toEqual([]);
  });

  it('ignora filtros null/undefined/vacíos', () => {
    expect(buildFilterChips({ style: null, district: '', daysOfWeek: [] }, [])).toEqual([]);
  });
});

describe('removeChip', () => {
  const filters: AiSearchFilters = { style: 'Salsa', district: 'Lince', daysOfWeek: [5, 6] };
  const tags = ['Fin de semana', 'Económico'];

  it('quita un filtro simple', () => {
    const chip = buildFilterChips(filters, tags).find(c => c.label === 'Lince')!;
    const next = removeChip(filters, tags, chip);
    expect(next.filters).toEqual({ style: 'Salsa', daysOfWeek: [5, 6] });
    expect(next.tags).toEqual(tags);
  });

  it('quita todos los días con un solo chip', () => {
    const chip = buildFilterChips(filters, tags).find(c => c.kind === 'days')!;
    expect(removeChip(filters, tags, chip).filters).toEqual({ style: 'Salsa', district: 'Lince' });
  });

  it('quita solo el tag elegido', () => {
    const chip = buildFilterChips(filters, tags).find(c => c.label === 'Económico')!;
    const next = removeChip(filters, tags, chip);
    expect(next.tags).toEqual(['Fin de semana']);
    expect(next.filters).toEqual(filters);
  });

  it('no muta los argumentos', () => {
    const chip = buildFilterChips(filters, tags)[0];
    removeChip(filters, tags, chip);
    expect(filters).toEqual({ style: 'Salsa', district: 'Lince', daysOfWeek: [5, 6] });
    expect(tags).toEqual(['Fin de semana', 'Económico']);
  });
});
