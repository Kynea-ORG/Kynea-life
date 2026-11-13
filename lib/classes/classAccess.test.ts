import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildClassColumns } from './helpers';
import { syncClassAccess, fetchClassAccessLink, copyClassAccess } from './classAccess';

type Op = { table: string; op: string; payload?: unknown; options?: unknown; filters: [string, unknown][] };

// Supabase simulado: registra cada operación y responde según `respond`.
function makeSupabase(respond: (op: Op) => { data?: unknown; error?: { message: string } | null } = () => ({})) {
  const log: Op[] = [];
  const from = (table: string) => {
    const state: Op = { table, op: '', payload: undefined, options: undefined, filters: [] };
    const settle = () => {
      log.push({ ...state, filters: [...state.filters] });
      const r = respond(state);
      return { data: r.data ?? null, error: r.error ?? null };
    };
    const b: Record<string, unknown> = {
      select: () => { if (!state.op) state.op = 'select'; return b; },
      upsert: (p: unknown, o: unknown) => { state.op = 'upsert'; state.payload = p; state.options = o; return b; },
      delete: () => { state.op = 'delete'; return b; },
      eq: (c: string, v: unknown) => { state.filters.push([c, v]); return b; },
      maybeSingle: () => Promise.resolve(settle()),
      then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(settle()).then(res, rej),
    };
    return b;
  };
  return { client: { from } as unknown as SupabaseClient, log };
}

describe('buildClassColumns — access_link', () => {
  it('ya no escribe access_link en la fila pública de classes', () => {
    const fd = new FormData();
    fd.set('type', 'taller');
    fd.set('title', 'Salsa online');
    fd.set('priceType', 'Gratis');
    fd.set('price', '0');
    fd.set('modality', 'Online');
    fd.set('status', 'draft');
    fd.set('accessLink', 'https://zoom.us/j/123');
    const cols = buildClassColumns(fd, { levelId: null, venueId: null });
    expect('access_link' in cols).toBe(false);
  });
});

describe('buildClassColumns — reservas', () => {
  function fd(extra: Record<string, string>) {
    const f = new FormData();
    f.set('type', 'taller'); f.set('title', 'X'); f.set('priceType', 'Gratis'); f.set('price', '0');
    f.set('modality', 'Presencial'); f.set('status', 'draft');
    for (const [k, v] of Object.entries(extra)) f.set(k, v);
    return f;
  }

  it('guarda booking_mode y cancellation_policy del formulario', () => {
    const cols = buildClassColumns(fd({ bookingMode: 'session', cancellationPolicy: 'flexible', maxSpots: '10' }), { levelId: null, venueId: null });
    expect(cols.booking_mode).toBe('session');
    expect(cols.cancellation_policy).toBe('flexible');
  });

  it('por defecto: none y moderada; ignora valores desconocidos', () => {
    const cols = buildClassColumns(fd({ bookingMode: 'hack', cancellationPolicy: 'x' }), { levelId: null, venueId: null });
    expect(cols.booking_mode).toBe('none');
    expect(cols.cancellation_policy).toBe('moderada');
  });

  it('con reservas activas NO incluye available_spots (lo mantiene la base de datos)', () => {
    const cols = buildClassColumns(fd({ bookingMode: 'class', maxSpots: '10' }), { levelId: null, venueId: null });
    expect('available_spots' in cols).toBe(false);
    expect(cols.max_spots).toBe(10);
  });

  it('sin reservas conserva available_spots = max_spots como siempre', () => {
    const cols = buildClassColumns(fd({ maxSpots: '10' }), { levelId: null, venueId: null });
    expect(cols.available_spots).toBe(10);
  });
});

describe('syncClassAccess', () => {
  it('guarda el enlace (recortado) con upsert por class_id', async () => {
    const { client, log } = makeSupabase();
    await syncClassAccess(client, 'c1', '  https://zoom.us/j/123  ');
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      table: 'class_access',
      op: 'upsert',
      payload: { class_id: 'c1', access_link: 'https://zoom.us/j/123' },
      options: { onConflict: 'class_id' },
    });
  });

  it.each([null, undefined, '', '   '])('borra la fila cuando el enlace es %j', async (link) => {
    const { client, log } = makeSupabase();
    await syncClassAccess(client, 'c1', link);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ table: 'class_access', op: 'delete', filters: [['class_id', 'c1']] });
  });

  it('lanza si la base devuelve error', async () => {
    const { client } = makeSupabase(() => ({ error: { message: 'boom' } }));
    await expect(syncClassAccess(client, 'c1', 'https://x.io')).rejects.toThrow('boom');
  });
});

describe('fetchClassAccessLink', () => {
  it('devuelve el enlace guardado', async () => {
    const { client, log } = makeSupabase(() => ({ data: { access_link: 'https://meet.google.com/abc' } }));
    await expect(fetchClassAccessLink(client, 'c1')).resolves.toBe('https://meet.google.com/abc');
    expect(log[0]).toMatchObject({ table: 'class_access', op: 'select', filters: [['class_id', 'c1']] });
  });

  it('devuelve null si no hay fila (o la RLS no deja verla)', async () => {
    const { client } = makeSupabase(() => ({ data: null }));
    await expect(fetchClassAccessLink(client, 'c1')).resolves.toBeNull();
  });
});

describe('copyClassAccess', () => {
  it('copia el enlace de una clase a su copia', async () => {
    const { client, log } = makeSupabase(op =>
      op.op === 'select' ? { data: { access_link: 'https://zoom.us/j/9' } } : {},
    );
    await copyClassAccess(client, 'orig', 'copy-1');
    const upserts = log.filter(o => o.op === 'upsert');
    expect(upserts).toHaveLength(1);
    expect(upserts[0].payload).toEqual({ class_id: 'copy-1', access_link: 'https://zoom.us/j/9' });
  });

  it('no escribe nada si la original no tiene enlace', async () => {
    const { client, log } = makeSupabase(() => ({ data: null }));
    await copyClassAccess(client, 'orig', 'copy-1');
    expect(log.filter(o => o.op === 'upsert' || o.op === 'delete')).toHaveLength(0);
  });
});
