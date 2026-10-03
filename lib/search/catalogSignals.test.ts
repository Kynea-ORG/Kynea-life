// lib/search/catalogSignals.test.ts
import { describe, it, expect } from 'vitest';
import { computeCatalogSignals, buildAiSuggestions } from './catalogSignals';
import { getValidClassBadges } from '@/lib/ai/badges';
import type { DanceClass } from '@/lib/types';

function cls(over: Partial<DanceClass> & { id: string }): DanceClass {
  return {
    title: 'Clase',
    style: 'Salsa',
    level: 'Intermedio',
    shortDescription: '',
    fullDescription: '',
    price: 100,
    modality: 'Presencial',
    district: 'Miraflores',
    city: 'Lima',
    ageGroup: 'Mayor +18 años',
    timeSlots: [{ days: ['Martes'], startTime: '19:30', endTime: '20:30' }],
    ...over,
  } as DanceClass;
}

describe('computeCatalogSignals', () => {
  it('cuenta estilos (principal y secundarios) y distritos, ordenados por frecuencia', () => {
    const s = computeCatalogSignals([
      cls({ id: '1', style: 'Salsa', district: 'Miraflores' }),
      cls({ id: '2', style: 'Salsa', district: 'Lince' }),
      cls({ id: '3', style: 'Bachata', secondaryStyles: ['Salsa'], district: 'Miraflores' }),
    ]);
    expect(s.totalClasses).toBe(3);
    expect(s.styles).toEqual([{ name: 'Salsa', count: 3 }, { name: 'Bachata', count: 1 }]);
    expect(s.districts[0]).toEqual({ name: 'Miraflores', count: 2 });
    expect(s.levels).toEqual(['Intermedio']);
  });

  it('ignora estilos y distritos vacíos', () => {
    const s = computeCatalogSignals([cls({ id: '1', style: '', district: '  ' })]);
    expect(s.styles).toEqual([]);
    expect(s.districts).toEqual([]);
  });

  it('devuelve señales vacías sin clases', () => {
    const s = computeCatalogSignals([]);
    expect(s.totalClasses).toBe(0);
    expect(s.styles).toEqual([]);
    expect(s.beginnerPair).toBeNull();
  });
});

describe('buildAiSuggestions', () => {
  const beginnerSalsa = cls({
    id: 'b', style: 'Salsa', level: 'Principiante', district: 'Miraflores',
    timeSlots: [{ days: ['Sábado'], startTime: '10:00', endTime: '11:00' }],
  });
  const kidsHeels = cls({
    id: 'k', style: 'Heels', level: 'Principiante', district: 'Lince', title: 'Heels Kids',
    ageGroup: 'Niños', timeSlots: [{ days: ['Sábado'], startTime: '11:00', endTime: '12:00' }],
  });
  const adultsEvening = cls({ id: 'e', style: 'Bachata', district: 'Lince' });

  it('sin clases no inventa nada: sin prompts y solo el placeholder neutro', () => {
    const r = buildAiSuggestions(computeCatalogSignals([]));
    expect(r.quickPrompts).toEqual([]);
    expect(r.placeholders).toEqual(['Cuéntame qué tienes en mente…']);
  });

  it('el primer placeholder siempre es el estático del primer paint', () => {
    const r = buildAiSuggestions(computeCatalogSignals([beginnerSalsa, kidsHeels, adultsEvening]));
    expect(r.placeholders[0]).toBe('Cuéntame qué tienes en mente…');
  });

  it('usa estilos y distritos reales en las sugerencias', () => {
    const r = buildAiSuggestions(computeCatalogSignals([beginnerSalsa]));
    const all = [...r.quickPrompts, ...r.placeholders].join(' | ');
    expect(all).toContain('Salsa');
    expect(all).toContain('Miraflores');
    expect(all).not.toMatch(/Bachata|Heels|Lince/);
  });

  it('no sugiere niños si no hay clases para niños', () => {
    const r = buildAiSuggestions(computeCatalogSignals([beginnerSalsa, adultsEvening]));
    expect([...r.quickPrompts, ...r.placeholders].join(' ').toLowerCase()).not.toContain('niño');
    expect([...r.quickPrompts, ...r.placeholders].join(' ').toLowerCase()).not.toContain('hija');
  });

  it('sugiere niños cuando existen, y fin de semana solo si coincide con una clase infantil de fin de semana', () => {
    const r = buildAiSuggestions(computeCatalogSignals([beginnerSalsa, kidsHeels]));
    const kids = r.quickPrompts.find(p => p.toLowerCase().includes('niño'));
    expect(kids).toBeDefined();
    expect(kids).toContain('fin de semana');

    const weekdayKids = cls({ ...kidsHeels, id: 'k2', timeSlots: [{ days: ['Martes'], startTime: '16:00', endTime: '17:00' }] });
    const r2 = buildAiSuggestions(computeCatalogSignals([weekdayKids]));
    const kids2 = r2.quickPrompts.find(p => p.toLowerCase().includes('niño'));
    expect(kids2).toBeDefined();
    expect(kids2).not.toContain('fin de semana');
  });

  it('no sugiere "después del trabajo" si no hay clases a partir de las 18:00', () => {
    const r = buildAiSuggestions(computeCatalogSignals([beginnerSalsa, kidsHeels]));
    expect([...r.quickPrompts, ...r.placeholders].join(' ').toLowerCase()).not.toContain('trabajo');
  });

  it('sugiere "después del trabajo" si existe al menos una clase nocturna', () => {
    const r = buildAiSuggestions(computeCatalogSignals([adultsEvening]));
    expect([...r.quickPrompts, ...r.placeholders].join(' ').toLowerCase()).toContain('trabajo');
  });

  it('"sábados en la mañana" solo aparece si hay una clase sabatina matutina', () => {
    const withSat = buildAiSuggestions(computeCatalogSignals([beginnerSalsa]));
    expect(withSat.placeholders.join(' ')).toContain('sábados en la mañana');
    const without = buildAiSuggestions(computeCatalogSignals([adultsEvening]));
    expect(without.placeholders.join(' ')).not.toContain('sábados');
  });

  it('principiantes: usa el estilo con clase de nivel inicial, no el más popular', () => {
    const popular = [1, 2, 3].map(i => cls({ id: `p${i}`, style: 'Bachata', level: 'Avanzado' }));
    const r = buildAiSuggestions(computeCatalogSignals([...popular, beginnerSalsa]));
    const begin = r.quickPrompts.find(p => p.toLowerCase().includes('desde cero'));
    expect(begin).toContain('Salsa');
    expect(begin).not.toContain('Bachata');
  });

  it('devuelve como máximo 4 prompts rápidos', () => {
    const r = buildAiSuggestions(computeCatalogSignals([beginnerSalsa, kidsHeels, adultsEvening]));
    expect(r.quickPrompts.length).toBeLessThanOrEqual(4);
    expect(r.quickPrompts.length).toBeGreaterThan(0);
  });

  it('es determinista', () => {
    const classes = [beginnerSalsa, kidsHeels, adultsEvening];
    expect(buildAiSuggestions(computeCatalogSignals(classes)))
      .toEqual(buildAiSuggestions(computeCatalogSignals(classes)));
  });

  it('cada filtro implícito de un prompt está respaldado por una clase real (badges)', () => {
    const classes = [beginnerSalsa, kidsHeels, adultsEvening];
    const r = buildAiSuggestions(computeCatalogSignals(classes));
    const probes: [RegExp, string][] = [
      [/niño/i, 'Para niños'],
      [/desde cero/i, 'Para principiantes'],
      [/trabajo/i, 'Post-trabajo'],
    ];
    for (const prompt of [...r.quickPrompts, ...r.placeholders]) {
      for (const [re, badge] of probes) {
        if (re.test(prompt)) {
          expect(classes.some(c => getValidClassBadges(c, [badge]).length > 0)).toBe(true);
        }
      }
    }
  });
});
