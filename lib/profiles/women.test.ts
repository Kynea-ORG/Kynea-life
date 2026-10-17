import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchWomanTeacherIds, countClassesTaughtBy, shouldShowWomenSection } from './women';

function supabaseReturning(result: { data: unknown; error: { code?: string; message: string } | null }) {
  const calls: { table?: string; filters: [string, unknown][]; cols?: string } = { filters: [] };
  const builder: Record<string, unknown> = {
    select: (cols: string) => { calls.cols = cols; return builder; },
    eq: (c: string, v: unknown) => { calls.filters.push([c, v]); return builder; },
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej),
  };
  const client = { from: vi.fn((t: string) => { calls.table = t; return builder; }) } as unknown as SupabaseClient;
  return { client, calls };
}

describe('fetchWomanTeacherIds', () => {
  it('devuelve los ids de profesores etiquetados como profesora', async () => {
    const { client, calls } = supabaseReturning({ data: [{ id: 'a' }, { id: 'b' }], error: null });
    expect(await fetchWomanTeacherIds(client)).toEqual(['a', 'b']);
    expect(calls.table).toBe('profiles');
    expect(calls.filters).toContainEqual(['is_woman', true]);
    expect(calls.filters).toContainEqual(['role', 'profesor']);
  });

  it('sin etiquetadas devuelve lista vacía', async () => {
    const { client } = supabaseReturning({ data: [], error: null });
    expect(await fetchWomanTeacherIds(client)).toEqual([]);
  });

  it('si la columna aún no existe (migración sin aplicar) no rompe: devuelve vacío', async () => {
    const { client } = supabaseReturning({ data: null, error: { code: '42703', message: 'column profiles.is_woman does not exist' } });
    expect(await fetchWomanTeacherIds(client)).toEqual([]);
  });

  it('cualquier otro error también degrada a vacío', async () => {
    const { client } = supabaseReturning({ data: null, error: { message: 'boom' } });
    expect(await fetchWomanTeacherIds(client)).toEqual([]);
  });
});

describe('countClassesTaughtBy', () => {
  const classes = [
    { teacher: { id: 'a' } },
    { teacher: { id: 'b' } },
    { teacher: { id: 'a' } },
    { teacher: { id: 'c' } },
  ];

  it('cuenta las clases cuyo profesor está en la lista', () => {
    expect(countClassesTaughtBy(classes, ['a', 'c'])).toBe(3);
  });

  it('lista vacía → 0', () => {
    expect(countClassesTaughtBy(classes, [])).toBe(0);
  });

  it('tolera clases sin profesor cargado', () => {
    expect(countClassesTaughtBy([{ teacher: undefined }, { teacher: { id: 'a' } }], ['a'])).toBe(1);
  });
});

describe('shouldShowWomenSection', () => {
  it('se muestra cuando hay clases de profesoras', () => {
    expect(shouldShowWomenSection(3, 'production')).toBe(true);
  });

  it('en producción no se muestra vacía', () => {
    expect(shouldShowWomenSection(0, 'production')).toBe(false);
    expect(shouldShowWomenSection(0, undefined)).toBe(false);
  });

  it('en desarrollo se muestra siempre, para poder ver y probar la sección', () => {
    expect(shouldShowWomenSection(0, 'development')).toBe(true);
  });
});
