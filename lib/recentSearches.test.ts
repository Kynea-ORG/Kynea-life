// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { getRecentSearches, recordRecentSearch } from './recentSearches';

beforeEach(() => {
  window.localStorage.clear();
});

describe('getRecentSearches', () => {
  it('returns an empty array when nothing was ever recorded', () => {
    expect(getRecentSearches()).toEqual([]);
  });
});

describe('recordRecentSearch', () => {
  it('does nothing for a blank/whitespace-only query — no entry, no crash', () => {
    recordRecentSearch({ query: '   ', href: '/clases/x', resultLabel: 'Salsa' });
    expect(getRecentSearches()).toEqual([]);
  });

  it('records a search and puts the newest entry first', () => {
    recordRecentSearch({ query: 'salsa', href: '/salsa/taller/c1', resultLabel: 'Salsa básica' });
    recordRecentSearch({ query: 'heels', href: '/heels/taller/c2', resultLabel: 'Heels básico' });
    const result = getRecentSearches();
    expect(result.map(s => s.query)).toEqual(['heels', 'salsa']);
  });

  it('deduplicates by query (case-insensitive), moving the re-searched entry to the front', () => {
    recordRecentSearch({ query: 'salsa', href: '/salsa/taller/c1', resultLabel: 'Salsa básica' });
    recordRecentSearch({ query: 'heels', href: '/heels/taller/c2', resultLabel: 'Heels básico' });
    recordRecentSearch({ query: 'SALSA', href: '/salsa/taller/c3', resultLabel: 'Salsa avanzada' });
    const result = getRecentSearches();
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ query: 'SALSA', href: '/salsa/taller/c3' });
    expect(result[1].query).toBe('heels');
  });

  it('caps history at 5 entries, dropping the oldest', () => {
    for (let i = 1; i <= 6; i++) {
      recordRecentSearch({ query: `query${i}`, href: `/x/${i}`, resultLabel: '' });
    }
    const result = getRecentSearches();
    expect(result).toHaveLength(5);
    expect(result.map(s => s.query)).toEqual(['query6', 'query5', 'query4', 'query3', 'query2']);
  });

  it('supports an empty resultLabel — the /resultados (ambiguous) case has no single result to name', () => {
    recordRecentSearch({ query: 'zzz-no-match', href: '/resultados?q=zzz-no-match', resultLabel: '' });
    const result = getRecentSearches();
    expect(result[0]).toMatchObject({ query: 'zzz-no-match', href: '/resultados?q=zzz-no-match', resultLabel: '' });
  });
});
