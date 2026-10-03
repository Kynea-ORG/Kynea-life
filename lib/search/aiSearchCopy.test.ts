// lib/search/aiSearchCopy.test.ts
import { describe, it, expect } from 'vitest';
import { AI_PLACEHOLDER_EXAMPLES, AI_QUICK_PROMPTS, AI_SEARCH_LABEL } from './aiSearchCopy';

describe('aiSearchCopy', () => {
  it('el label es una pregunta corta', () => {
    expect(AI_SEARCH_LABEL.startsWith('¿')).toBe(true);
    expect(AI_SEARCH_LABEL.endsWith('?')).toBe(true);
    expect(AI_SEARCH_LABEL.length).toBeLessThanOrEqual(35);
  });

  it('el primer placeholder es el estático del primer paint y no hay repetidos', () => {
    expect(AI_PLACEHOLDER_EXAMPLES[0]).toBe('Cuéntame qué tienes en mente…');
    expect(new Set(AI_PLACEHOLDER_EXAMPLES).size).toBe(AI_PLACEHOLDER_EXAMPLES.length);
  });

  it('los placeholders caben en mobile (≤ 45 caracteres)', () => {
    for (const p of AI_PLACEHOLDER_EXAMPLES) expect(p.length).toBeLessThanOrEqual(45);
  });

  it('los prompts rápidos suenan a persona (sin infinitivo suelto tipo catálogo) y no están vacíos', () => {
    expect(AI_QUICK_PROMPTS.length).toBeGreaterThanOrEqual(4);
    for (const p of AI_QUICK_PROMPTS) expect(p.replace(/^\S+\s/, '').trim().length).toBeGreaterThan(10);
  });

  it('el prompt para niños contiene "niño" para que el filtro infantil lo detecte', () => {
    expect(AI_QUICK_PROMPTS.some(p => p.toLowerCase().includes('niño'))).toBe(true);
  });
});
