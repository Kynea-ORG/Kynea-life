import { describe, it, expect } from 'vitest';
import { selectHomeRecommendedClasses } from './homeRecommendations';
import type { DanceClass, Teacher } from '@/lib/types';

// Notion task: "Home: 'Clases de baile para ti' con mezcla y rotación
// (evitar repetidas)" — acceptance criteria explicitly calls out: profesor
// con muchas clases recientes, pocos profesores disponibles, cold-start sin
// historial. Covered below in that order, plus the rotation mechanism itself.

function teacher(id: string): Teacher {
  return {
    id, slug: id, name: id, type: 'profesor', photo: '', photoPosition: '50% 50%', photoZoom: 1,
    bio: '', experience: 0, styles: [], whatsapp: '', showSpots: true, email: '',
  };
}

function cls(id: string, teacherId: string, publishedAt: string): DanceClass {
  return {
    id, type: 'taller', title: id, slug: id, style: 'Salsa', styleSlug: 'salsa',
    level: 'Básico', shortDescription: '', fullDescription: '', whatYouLearn: [],
    startDate: '2026-10-01', recurrence: 'mensual', timeSlots: [], priceType: 'Mensual',
    price: 100, currency: 'PEN', modality: 'Presencial', city: 'Lima', district: 'Miraflores',
    coverImage: '', coverImagePosition: '50% 50%', coverImageZoom: 1, gallery: [], toBring: [],
    contactMode: 'whatsapp', status: 'published',
    teacher: teacher(teacherId),
    metrics: { views: 0, contacts: 0, saved: 0 },
    createdAt: publishedAt, publishedAt,
  };
}

describe('selectHomeRecommendedClasses', () => {
  it('cold-start: no classes at all returns an empty list without crashing', () => {
    expect(selectHomeRecommendedClasses([], { seed: '2026-09-09' })).toEqual([]);
  });

  it('few available teachers: fewer classes than the limit still returns all eligible ones', () => {
    const classes = [
      cls('c1', 't1', '2026-09-01'),
      cls('c2', 't2', '2026-09-02'),
      cls('c3', 't1', '2026-09-03'),
    ];
    const result = selectHomeRecommendedClasses(classes, { seed: '2026-09-09', limit: 12 });
    expect(result).toHaveLength(3);
    expect(new Set(result.map(c => c.id))).toEqual(new Set(['c1', 'c2', 'c3']));
  });

  it('one teacher with many recent classes never exceeds maxPerTeacher in the result', () => {
    const classes = [
      ...Array.from({ length: 10 }, (_, i) => cls(`prolific-${i}`, 'prolific-teacher', `2026-09-${10 - i}`)),
      cls('other-1', 'other-teacher', '2026-08-20'),
    ];
    const result = selectHomeRecommendedClasses(classes, { seed: '2026-09-09', maxPerTeacher: 2, limit: 12 });
    const fromProlific = result.filter(c => c.teacher.id === 'prolific-teacher');
    expect(fromProlific.length).toBeLessThanOrEqual(2);
    // The one class from the other teacher must still make it in — the cap
    // shouldn't let one teacher crowd out everyone else entirely.
    expect(result.some(c => c.teacher.id === 'other-teacher')).toBe(true);
  });

  it('respects the requested limit even when more eligible classes exist', () => {
    const classes = Array.from({ length: 20 }, (_, i) => cls(`c${i}`, `t${i}`, '2026-09-01'));
    const result = selectHomeRecommendedClasses(classes, { seed: '2026-09-09', limit: 5 });
    expect(result).toHaveLength(5);
  });

  it('only looks at the top poolSize most recent classes, ignoring older ones entirely', () => {
    const recent = Array.from({ length: 5 }, (_, i) => cls(`recent-${i}`, `t${i}`, '2026-09-05'));
    const old = cls('very-old', 'old-teacher', '2020-01-01');
    const result = selectHomeRecommendedClasses([...recent, old], { seed: '2026-09-09', poolSize: 5, limit: 12 });
    expect(result.some(c => c.id === 'very-old')).toBe(false);
  });

  it('rotation: the same seed always produces the same order (deterministic)', () => {
    const classes = Array.from({ length: 8 }, (_, i) => cls(`c${i}`, `t${i}`, '2026-09-01'));
    const a = selectHomeRecommendedClasses(classes, { seed: '2026-09-09' });
    const b = selectHomeRecommendedClasses(classes, { seed: '2026-09-09' });
    expect(a.map(c => c.id)).toEqual(b.map(c => c.id));
  });

  it('rotation: a different seed (a different day) produces a different order', () => {
    const classes = Array.from({ length: 12 }, (_, i) => cls(`c${i}`, `t${i}`, '2026-09-01'));
    const day1 = selectHomeRecommendedClasses(classes, { seed: '2026-09-09' });
    const day2 = selectHomeRecommendedClasses(classes, { seed: '2026-09-10' });
    expect(day1.map(c => c.id)).not.toEqual(day2.map(c => c.id));
  });
});
