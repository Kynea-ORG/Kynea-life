import { describe, it, expect } from 'vitest';
import { aggregateActiveClassCounts, filterAndRankByActiveClasses } from './queries';
import type { Teacher } from '@/lib/types';

// Notion task: "Home: ordenar/filtrar profesores destacados (solo con
// clases)" — acceptance criteria explicitly calls out 0 clases, 1+ clases,
// and clases no publicadas/archivadas as the cases to cover. The last one is
// exercised at the query level (getFeaturedProfiles only ever selects
// status='published' rows in the first place), so these pure functions cover
// grouping/ranking on whatever active-class rows the query already resolved.

function teacher(id: string, overrides: Partial<Teacher> = {}): Teacher {
  return {
    id, slug: id, name: id, type: 'profesor', photo: '', photoPosition: '50% 50%', photoZoom: 1,
    bio: '', experience: 0, styles: [], whatsapp: '', showSpots: true, email: '',
    ...overrides,
  };
}

describe('aggregateActiveClassCounts', () => {
  it('returns an empty map for no rows (teacher with 0 clases)', () => {
    expect(aggregateActiveClassCounts([]).size).toBe(0);
  });

  it('counts multiple rows for the same teacher and tracks the latest published_at', () => {
    const map = aggregateActiveClassCounts([
      { teacher_id: 't1', published_at: '2026-08-01T00:00:00Z' },
      { teacher_id: 't1', published_at: '2026-09-01T00:00:00Z' },
      { teacher_id: 't1', published_at: '2026-08-15T00:00:00Z' },
    ]);
    expect(map.get('t1')).toEqual({ count: 3, lastPublishedAt: '2026-09-01T00:00:00Z' });
  });

  it('keeps separate counts per teacher', () => {
    const map = aggregateActiveClassCounts([
      { teacher_id: 't1', published_at: '2026-08-01T00:00:00Z' },
      { teacher_id: 't2', published_at: '2026-08-02T00:00:00Z' },
      { teacher_id: 't2', published_at: '2026-08-03T00:00:00Z' },
    ]);
    expect(map.get('t1')?.count).toBe(1);
    expect(map.get('t2')?.count).toBe(2);
  });

  it('handles a null published_at without crashing or counting it as "latest"', () => {
    const map = aggregateActiveClassCounts([
      { teacher_id: 't1', published_at: null },
      { teacher_id: 't1', published_at: '2026-08-01T00:00:00Z' },
    ]);
    expect(map.get('t1')).toEqual({ count: 2, lastPublishedAt: '2026-08-01T00:00:00Z' });
  });
});

describe('filterAndRankByActiveClasses', () => {
  it('excludes a teacher with 0 clases (not present in the activity map)', () => {
    const teachers = [teacher('t1'), teacher('t2')];
    const activity = aggregateActiveClassCounts([{ teacher_id: 't1', published_at: '2026-08-01T00:00:00Z' }]);
    const result = filterAndRankByActiveClasses(teachers, activity, 10);
    expect(result.map(t => t.id)).toEqual(['t1']);
  });

  it('ranks teachers with more active clases first', () => {
    const teachers = [teacher('t1'), teacher('t2'), teacher('t3')];
    const activity = aggregateActiveClassCounts([
      { teacher_id: 't1', published_at: '2026-08-01T00:00:00Z' },
      { teacher_id: 't2', published_at: '2026-08-01T00:00:00Z' },
      { teacher_id: 't2', published_at: '2026-08-02T00:00:00Z' },
      { teacher_id: 't2', published_at: '2026-08-03T00:00:00Z' },
      { teacher_id: 't3', published_at: '2026-08-01T00:00:00Z' },
      { teacher_id: 't3', published_at: '2026-08-02T00:00:00Z' },
    ]);
    const result = filterAndRankByActiveClasses(teachers, activity, 10);
    expect(result.map(t => t.id)).toEqual(['t2', 't3', 't1']);
  });

  it('breaks a tie in class count by most recently published', () => {
    const teachers = [teacher('t1'), teacher('t2')];
    const activity = aggregateActiveClassCounts([
      { teacher_id: 't1', published_at: '2026-08-01T00:00:00Z' },
      { teacher_id: 't2', published_at: '2026-09-01T00:00:00Z' },
    ]);
    const result = filterAndRankByActiveClasses(teachers, activity, 10);
    expect(result.map(t => t.id)).toEqual(['t2', 't1']);
  });

  it('respects the limit after ranking, not before', () => {
    const teachers = [teacher('t1'), teacher('t2'), teacher('t3')];
    const activity = aggregateActiveClassCounts([
      { teacher_id: 't1', published_at: '2026-08-01T00:00:00Z' },
      { teacher_id: 't2', published_at: '2026-08-01T00:00:00Z' },
      { teacher_id: 't2', published_at: '2026-08-02T00:00:00Z' },
      { teacher_id: 't3', published_at: '2026-08-01T00:00:00Z' },
      { teacher_id: 't3', published_at: '2026-08-02T00:00:00Z' },
      { teacher_id: 't3', published_at: '2026-08-03T00:00:00Z' },
    ]);
    const result = filterAndRankByActiveClasses(teachers, activity, 2);
    expect(result.map(t => t.id)).toEqual(['t3', 't2']);
  });

  it('returns an empty array when no teacher has any active clases', () => {
    const teachers = [teacher('t1'), teacher('t2')];
    const activity = aggregateActiveClassCounts([]);
    expect(filterAndRankByActiveClasses(teachers, activity, 10)).toEqual([]);
  });
});
