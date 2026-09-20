// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useClassFilters } from './useClassFilters';
import type { DanceClass } from '@/lib/types';

let mockSearchParams = new URLSearchParams();
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

function createSampleClass(partial: Partial<DanceClass>): DanceClass {
  return {
    id: 'c1',
    slug: 'slug-1',
    title: 'Clase Test',
    type: 'clase-suelta',
    style: 'Salsa',
    level: 'Principiante',
    shortDescription: '',
    fullDescription: '',
    whatYouLearn: [],
    startDate: '2026-01-01',
    recurrence: 'mensual',
    timeSlots: [],
    priceType: 'Fijo',
    price: 30,
    currency: 'PEN',
    modality: 'Presencial',
    city: 'Lima',
    district: 'Miraflores',
    status: 'published',
    isPublished: true,
    publishedAt: '2026-01-01T00:00:00Z',
    viewsCount: 0,
    contactClicksCount: 0,
    savesCount: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    teacher: {
      id: 't1',
      name: 'Profesor Test',
      username: 'proftest',
      role: 'profesor',
      verified: true,
    },
    ...partial,
  } as DanceClass;
}

describe('useClassFilters — district filtering', () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    mockPush.mockReset();
    mockReplace.mockReset();
  });

  const classes: DanceClass[] = [
    createSampleClass({ id: 'c-miraflores', title: 'Salsa Miraflores', district: 'Miraflores' }),
    createSampleClass({ id: 'c-sjm', title: 'Bachata SJM', district: 'San Juan de Miraflores' }),
    createSampleClass({ id: 'c-surco', title: 'Hip Hop Surco', district: 'Surco' }),
    createSampleClass({ id: 'c-stgo-surco', title: 'K-Pop Santiago Surco', district: 'Santiago de Surco' }),
    createSampleClass({ id: 'c-barranco', title: 'Reggaeton Barranco', district: 'Barranco' }),
  ];

  it('filters strictly by Miraflores and excludes San Juan de Miraflores', () => {
    mockSearchParams = new URLSearchParams({ city: 'Lima', district: 'Miraflores' });
    const { result } = renderHook(() =>
      useClassFilters({ initialClasses: classes, baseUrl: '/clases', includeStyles: true })
    );

    const ids = result.current.results.map(c => c.id);
    expect(ids).toContain('c-miraflores');
    expect(ids).not.toContain('c-sjm');
    expect(ids).not.toContain('c-surco');
    expect(ids).not.toContain('c-barranco');
  });

  it('filters strictly by San Juan de Miraflores and excludes Miraflores', () => {
    mockSearchParams = new URLSearchParams({ city: 'Lima', district: 'San Juan de Miraflores' });
    const { result } = renderHook(() =>
      useClassFilters({ initialClasses: classes, baseUrl: '/clases', includeStyles: true })
    );

    const ids = result.current.results.map(c => c.id);
    expect(ids).toContain('c-sjm');
    expect(ids).not.toContain('c-miraflores');
  });

  it('matches both Surco and Santiago de Surco when Santiago de Surco is selected', () => {
    mockSearchParams = new URLSearchParams({ city: 'Lima', district: 'Santiago de Surco' });
    const { result } = renderHook(() =>
      useClassFilters({ initialClasses: classes, baseUrl: '/clases', includeStyles: true })
    );

    const ids = result.current.results.map(c => c.id);
    expect(ids).toContain('c-surco');
    expect(ids).toContain('c-stgo-surco');
    expect(ids).not.toContain('c-miraflores');
  });

  it('matches both Surco and Santiago de Surco when Surco is selected', () => {
    mockSearchParams = new URLSearchParams({ city: 'Lima', district: 'Surco' });
    const { result } = renderHook(() =>
      useClassFilters({ initialClasses: classes, baseUrl: '/clases', includeStyles: true })
    );

    const ids = result.current.results.map(c => c.id);
    expect(ids).toContain('c-surco');
    expect(ids).toContain('c-stgo-surco');
    expect(ids).not.toContain('c-miraflores');
  });
});
