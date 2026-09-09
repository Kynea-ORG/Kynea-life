import { describe, it, expect } from 'vitest';
import { normalizeText, extractKeywords, searchKeywords, matchesAllKeywords } from './normalize';

describe('normalizeText', () => {
  it('lowercases, strips accents, and trims', () => {
    expect(normalizeText('  Sálsa  ')).toBe('salsa');
    expect(normalizeText('BACHATA')).toBe('bachata');
  });
});

describe('extractKeywords', () => {
  it('drops filler words around a style name', () => {
    expect(extractKeywords('clases de salsa')).toEqual(['salsa']);
    expect(extractKeywords('quiero un profesor de bachata cerca')).toEqual(['bachata']);
  });

  it('preserves a multi-word style phrase in order', () => {
    expect(extractKeywords('quiero clases de hip hop')).toEqual(['hip', 'hop']);
  });

  it('strips role words so a bare name survives', () => {
    expect(extractKeywords('profesor Zeus Villanueva')).toEqual(['zeus', 'villanueva']);
    expect(extractKeywords('academia Sunshine Move')).toEqual(['sunshine', 'move']);
  });

  it('returns an empty array when the whole phrase is filler', () => {
    expect(extractKeywords('quiero clases de baile')).toEqual([]);
  });

  it('deduplicates repeated words, keeping first-seen order', () => {
    expect(extractKeywords('salsa salsa bachata')).toEqual(['salsa', 'bachata']);
  });

  it('leaves an already-bare keyword untouched', () => {
    expect(extractKeywords('salsa')).toEqual(['salsa']);
  });
});

describe('searchKeywords', () => {
  it('matches extractKeywords when it finds real keywords', () => {
    expect(searchKeywords('clases de salsa')).toEqual(['salsa']);
  });

  it('falls back to the whole normalized phrase when everything is filler', () => {
    expect(searchKeywords('quiero clases de baile')).toEqual(['quiero clases de baile']);
  });

  it('returns an empty array for a blank query', () => {
    expect(searchKeywords('   ')).toEqual([]);
  });
});

describe('matchesAllKeywords', () => {
  it('requires every keyword to appear somewhere in the haystack', () => {
    expect(matchesAllKeywords(['salsa', 'miraflores'], 'Taller de Salsa · Miraflores, Lima')).toBe(true);
  });

  it('rejects a haystack missing even one keyword', () => {
    expect(matchesAllKeywords(['salsa', 'miraflores'], 'Taller de Flamenco · Miraflores, Lima')).toBe(false);
  });

  it('is accent- and case-insensitive', () => {
    expect(matchesAllKeywords(['bailar'], 'Ven a BAILAR con nosotros')).toBe(true);
  });

  it('matches everything when there are no keywords to check', () => {
    expect(matchesAllKeywords([], 'cualquier cosa')).toBe(true);
  });
});
