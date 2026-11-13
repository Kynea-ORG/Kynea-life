import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { purgeSentEmails, enqueueEmail, buildBookingEmailPayload } from './outbox';

function makeAdmin(result: { error: { message: string; code?: string } | null } = { error: null }) {
  const calls: { table: string; payload: unknown; options: unknown }[] = [];
  const client = {
    from: (table: string) => ({
      upsert: (payload: unknown, options: unknown) => {
        calls.push({ table, payload, options });
        return Promise.resolve(result);
      },
    }),
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe('enqueueEmail', () => {
  it('guarda el correo pendiente ignorando duplicados por dedupe_key', async () => {
    const { client, calls } = makeAdmin();
    await enqueueEmail(client, { to: 'a@b.com', template: 'booking_confirmed', payload: { x: 1 }, dedupeKey: 'booking_confirmed:1' });
    expect(calls).toHaveLength(1);
    expect(calls[0].table).toBe('email_outbox');
    expect(calls[0].payload).toEqual({ to_email: 'a@b.com', template: 'booking_confirmed', payload: { x: 1 }, dedupe_key: 'booking_confirmed:1' });
    expect(calls[0].options).toEqual({ onConflict: 'dedupe_key', ignoreDuplicates: true });
  });

  it('no encola si falta el destinatario', async () => {
    const { client, calls } = makeAdmin();
    await enqueueEmail(client, { to: '  ', template: 't', payload: {}, dedupeKey: 'k' });
    expect(calls).toHaveLength(0);
  });

  it('lanza si la base devuelve error', async () => {
    const { client } = makeAdmin({ error: { message: 'boom' } });
    await expect(enqueueEmail(client, { to: 'a@b.com', template: 't', payload: {}, dedupeKey: 'k' })).rejects.toThrow('boom');
  });
});

describe('buildBookingEmailPayload', () => {
  const row = {
    id: 'b1', seats: 2, price_amount: 80, currency: 'PEN', payment_method: 'pay_at_venue',
    class: {
      id: 'c1', title: 'Taller de bachata', slug: 'taller-bachata', type: 'taller', modality: 'Presencial',
      start_date: '2026-11-23', end_date: '2026-11-23', cancellation_policy: 'flexible',
      footwear: ['Zapatillas'], clothing: 'Ropa cómoda', to_bring: ['Agua'],
      venue: { name: 'Estudio Sol', address: 'Av. Test 123', reference: 'Al costado del banco', maps_url: 'https://maps.app/x', city: 'Lima' },
    },
    session: null,
  };

  it('reúne lo que el alumno necesita: cuándo, dónde y qué llevar', () => {
    const p = buildBookingEmailPayload(row);
    expect(p).toMatchObject({
      bookingId: 'b1', classTitle: 'Taller de bachata', seats: 2, price: 80, currency: 'PEN',
      paymentMethod: 'pay_at_venue', date: '2026-11-23', venueName: 'Estudio Sol', address: 'Av. Test 123',
      reference: 'Al costado del banco', mapsUrl: 'https://maps.app/x', footwear: ['Zapatillas'],
      clothing: 'Ropa cómoda', toBring: ['Agua'], cancellationPolicy: 'flexible',
    });
  });

  it('usa la fecha y hora de la sesión cuando la reserva es por fecha', () => {
    const p = buildBookingEmailPayload({ ...row, session: { session_date: '2026-12-02', start_time: '19:00:00', end_time: '20:30:00' } });
    expect(p).toMatchObject({ date: '2026-12-02', startTime: '19:00', endTime: '20:30' });
  });

  it('tolera una clase online sin sede', () => {
    const p = buildBookingEmailPayload({ ...row, class: { ...row.class, modality: 'Online', venue: null } });
    expect(p.venueName).toBeUndefined();
    expect(p.modality).toBe('Online');
  });
});

describe('purgeSentEmails', () => {
  it('borra solo los correos enviados antes de la fecha de corte', async () => {
    const calls: unknown[][] = [];
    const chain = {
      delete: (...a: unknown[]) => { calls.push(['delete', ...a]); return chain; },
      eq: (...a: unknown[]) => { calls.push(['eq', ...a]); return chain; },
      lt: (...a: unknown[]) => { calls.push(['lt', ...a]); return chain; },
      select: async () => ({ data: [{ id: 'a' }, { id: 'b' }], error: null }),
    };
    const admin = { from: (t: string) => { calls.push(['from', t]); return chain; } } as unknown as SupabaseClient;
    const n = await purgeSentEmails(admin, 60, new Date('2026-11-14T12:00:00Z'));
    expect(n).toBe(2);
    expect(calls).toContainEqual(['from', 'email_outbox']);
    expect(calls).toContainEqual(['eq', 'status', 'sent']);
    expect(calls).toContainEqual(['lt', 'sent_at', '2026-09-15T12:00:00.000Z']);
  });

  it('si falla devuelve 0 sin lanzar', async () => {
    const chain = { delete: () => chain, eq: () => chain, lt: () => chain, select: async () => ({ data: null, error: { message: 'x' } }) };
    const admin = { from: () => chain } as unknown as SupabaseClient;
    expect(await purgeSentEmails(admin, 60)).toBe(0);
  });
});
