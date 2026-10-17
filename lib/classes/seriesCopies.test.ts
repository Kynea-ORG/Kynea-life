import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSeriesCopies } from './seriesCopies';

type Op = { table: string; op: string; payload?: unknown; filters: [string, unknown][] };

// Supabase simulado: registra cada operación y responde según `respond`.
function makeSupabase(respond: (op: Op) => { data?: unknown; error?: { message: string } | null }) {
  const log: Op[] = [];
  const from = (table: string) => {
    const state: Op = { table, op: '', payload: undefined, filters: [] };
    const settle = () => {
      const snapshot: Op = { ...state, filters: [...state.filters] };
      log.push(snapshot);
      const r = respond(snapshot);
      return { data: r.data ?? null, error: r.error ?? null };
    };
    const b: Record<string, unknown> = {
      select: () => { if (!state.op) state.op = 'select'; return b; },
      insert: (p: unknown) => { state.op = 'insert'; state.payload = p; return b; },
      update: (p: unknown) => { state.op = 'update'; state.payload = p; return b; },
      delete: () => { state.op = 'delete'; return b; },
      eq: (c: string, v: unknown) => { state.filters.push([c, v]); return b; },
      in: (c: string, v: unknown) => { state.filters.push([c, v]); return b; },
      single: () => Promise.resolve(settle()),
      then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(settle()).then(res, rej),
    };
    return b;
  };
  return { client: { from } as unknown as SupabaseClient, log };
}

const ORIGINAL = {
  id: 'orig',
  teacher_id: 'teacher-1',
  title: 'Salsa Básico',
  slug: 'salsa-basico',
  status: 'published',
  start_date: '2026-10-03',
  end_date: '2026-10-30',
  max_spots: 20,
  available_spots: 7,
  series_id: null as string | null,
  views_count: 50, contacts_count: 5, saved_count: 3,
  created_at: 'x', updated_at: 'y', published_at: 'z',
  auto_publish_at: null, auto_published_at: null, auto_publish_error: null,
  venue_id: 'v1', cover_image: 'cover.jpg',
};

function standardRespond(overrides?: { failOnInsertNumber?: number; original?: Record<string, unknown> }) {
  let inserted = 0;
  return (op: Op) => {
    if (op.table === 'classes' && op.op === 'select') return { data: overrides?.original ?? ORIGINAL };
    if (op.table === 'class_styles' && op.op === 'select') return { data: [{ style_id: 4, is_main: true }] };
    if (op.table === 'class_schedules' && op.op === 'select') {
      return { data: [{ day_of_week: 1, start_time: '19:00', end_time: '20:30' }] };
    }
    if (op.table === 'classes' && op.op === 'insert') {
      inserted += 1;
      if (overrides?.failOnInsertNumber === inserted) return { error: { message: 'boom' } };
      return { data: { id: `copy-${inserted}` } };
    }
    return {};
  };
}

const inserts = (log: Op[], table: string) => log.filter(o => o.table === table && o.op === 'insert');

describe('createSeriesCopies', () => {
  it('crea una copia en borrador por mes con las fechas desplazadas', async () => {
    const { client, log } = makeSupabase(standardRespond());
    const res = await createSeriesCopies(client, {
      originalId: 'orig', teacherId: 'teacher-1', months: ['2026-11', '2026-12'], autoPublish: true,
    });

    expect(res).toEqual({ ok: true, createdIds: ['copy-1', 'copy-2'] });
    const rows = inserts(log, 'classes').map(o => o.payload as Record<string, unknown>);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ status: 'draft', start_date: '2026-11-03', end_date: '2026-11-30', published_at: null });
    expect(rows[1]).toMatchObject({ status: 'draft', start_date: '2026-12-03', end_date: '2026-12-30' });
  });

  it('programa la publicación 14 días antes del inicio solo si autoPublish', async () => {
    const on = makeSupabase(standardRespond());
    await createSeriesCopies(on.client, { originalId: 'orig', teacherId: 'teacher-1', months: ['2026-11'], autoPublish: true });
    expect((inserts(on.log, 'classes')[0].payload as Record<string, unknown>).auto_publish_at).toBe('2026-10-20');

    const off = makeSupabase(standardRespond());
    await createSeriesCopies(off.client, { originalId: 'orig', teacherId: 'teacher-1', months: ['2026-11'], autoPublish: false });
    expect((inserts(off.log, 'classes')[0].payload as Record<string, unknown>).auto_publish_at).toBeNull();
  });

  it('no arrastra identificadores, contadores ni marcas de publicación de la original', async () => {
    const { client, log } = makeSupabase(standardRespond());
    await createSeriesCopies(client, { originalId: 'orig', teacherId: 'teacher-1', months: ['2026-11'], autoPublish: true });
    const row = inserts(log, 'classes')[0].payload as Record<string, unknown>;
    for (const k of ['id', 'created_at', 'updated_at', 'views_count', 'contacts_count', 'saved_count']) {
      expect(row).not.toHaveProperty(k);
    }
    expect(row.auto_published_at).toBeNull();
    expect(row.auto_publish_error).toBeNull();
    expect(row.available_spots).toBe(20);
    expect(row.venue_id).toBe('v1');
    expect(row.cover_image).toBe('cover.jpg');
  });

  it('usa un slug explícito con el mes para distinguir las copias', async () => {
    const { client, log } = makeSupabase(standardRespond());
    await createSeriesCopies(client, { originalId: 'orig', teacherId: 'teacher-1', months: ['2026-11', '2027-01'], autoPublish: true });
    const slugs = inserts(log, 'classes').map(o => (o.payload as Record<string, unknown>).slug);
    expect(slugs).toEqual(['salsa-basico-noviembre-2026', 'salsa-basico-enero-2027']);
  });

  it('vincula original y copias con el mismo series_id (y lo crea si faltaba)', async () => {
    const { client, log } = makeSupabase(standardRespond());
    await createSeriesCopies(client, { originalId: 'orig', teacherId: 'teacher-1', months: ['2026-11', '2026-12'], autoPublish: true });

    const origUpdate = log.find(o => o.table === 'classes' && o.op === 'update');
    const seriesId = (origUpdate?.payload as { series_id: string }).series_id;
    expect(seriesId).toMatch(/[0-9a-f-]{36}/);
    expect(origUpdate?.filters).toContainEqual(['id', 'orig']);

    const copies = inserts(log, 'classes').map(o => (o.payload as Record<string, unknown>).series_id);
    expect(copies).toEqual([seriesId, seriesId]);
  });

  it('reutiliza el series_id existente sin reescribir la original', async () => {
    const { client, log } = makeSupabase(standardRespond({ original: { ...ORIGINAL, series_id: 'serie-1' } }));
    await createSeriesCopies(client, { originalId: 'orig', teacherId: 'teacher-1', months: ['2026-11'], autoPublish: true });
    expect(log.find(o => o.table === 'classes' && o.op === 'update')).toBeUndefined();
    expect((inserts(log, 'classes')[0].payload as Record<string, unknown>).series_id).toBe('serie-1');
  });

  it('copia estilos y horarios a cada copia con su nuevo class_id', async () => {
    const { client, log } = makeSupabase(standardRespond());
    await createSeriesCopies(client, { originalId: 'orig', teacherId: 'teacher-1', months: ['2026-11', '2026-12'], autoPublish: true });
    const styles = inserts(log, 'class_styles').flatMap(o => o.payload as { class_id: string }[]);
    const scheds = inserts(log, 'class_schedules').flatMap(o => o.payload as { class_id: string }[]);
    expect(styles.map(r => r.class_id)).toEqual(['copy-1', 'copy-2']);
    expect(scheds.map(r => r.class_id)).toEqual(['copy-1', 'copy-2']);
  });

  it('lee la original solo si pertenece al profesor', async () => {
    const { client, log } = makeSupabase(standardRespond());
    await createSeriesCopies(client, { originalId: 'orig', teacherId: 'teacher-1', months: ['2026-11'], autoPublish: true });
    const read = log.find(o => o.table === 'classes' && o.op === 'select')!;
    expect(read.filters).toContainEqual(['id', 'orig']);
    expect(read.filters).toContainEqual(['teacher_id', 'teacher-1']);
  });

  it('si una copia falla, borra las ya creadas y devuelve error', async () => {
    const { client, log } = makeSupabase(standardRespond({ failOnInsertNumber: 2 }));
    const res = await createSeriesCopies(client, {
      originalId: 'orig', teacherId: 'teacher-1', months: ['2026-11', '2026-12', '2027-01'], autoPublish: true,
    });
    expect(res.ok).toBe(false);
    const del = log.find(o => o.table === 'classes' && o.op === 'delete')!;
    expect(del.filters).toContainEqual(['id', ['copy-1']]);
    expect(inserts(log, 'classes')).toHaveLength(2); // se detiene en la que falló
  });

  it('sin meses no hace nada', async () => {
    const { client, log } = makeSupabase(standardRespond());
    const res = await createSeriesCopies(client, { originalId: 'orig', teacherId: 'teacher-1', months: [], autoPublish: true });
    expect(res).toEqual({ ok: true, createdIds: [] });
    expect(log).toHaveLength(0);
  });

  it('una clase sin fecha de fin usa la de inicio', async () => {
    const { client, log } = makeSupabase(standardRespond({ original: { ...ORIGINAL, end_date: null } }));
    await createSeriesCopies(client, { originalId: 'orig', teacherId: 'teacher-1', months: ['2026-11'], autoPublish: false });
    expect(inserts(log, 'classes')[0].payload).toMatchObject({ start_date: '2026-11-03', end_date: '2026-11-03' });
  });
});
