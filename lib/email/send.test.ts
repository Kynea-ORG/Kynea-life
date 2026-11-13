import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail, dispatchOutbox } from './send';

const fetchMock = vi.fn();
const ENV = { ...process.env };

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  process.env = { ...ENV, RESEND_API_KEY: 're_test', EMAIL_FROM: 'Kynea <reservas@kynea.dance>', NEXT_PUBLIC_SITE_URL: 'https://kynea.dance' };
});
afterEach(() => { vi.unstubAllGlobals(); process.env = ENV; });

describe('sendEmail', () => {
  it('sin RESEND_API_KEY no envía y lo avisa', async () => {
    delete process.env.RESEND_API_KEY;
    expect(await sendEmail({ to: 'a@b.com', subject: 's', html: 'h', text: 't' })).toEqual({ sent: false, reason: 'not_configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('llama a la API de Resend con remitente, asunto y cuerpos', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'e1' }) });
    const r = await sendEmail({ to: 'a@b.com', subject: 'Hola', html: '<p>h</p>', text: 't' });
    expect(r).toEqual({ sent: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_test');
    expect(JSON.parse(init.body)).toMatchObject({ from: 'Kynea <reservas@kynea.dance>', to: ['a@b.com'], subject: 'Hola', html: '<p>h</p>', text: 't' });
  });

  it('devuelve el error de la API sin lanzar', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403, text: async () => 'domain not verified' });
    const r = await sendEmail({ to: 'a@b.com', subject: 's', html: 'h', text: 't' });
    expect(r).toMatchObject({ sent: false, reason: 'error' });
    expect((r as { error: string }).error).toContain('403');
  });
});

function makeAdmin(rows: unknown[]) {
  const updates: { id: string; patch: Record<string, unknown> }[] = [];
  const rpc = vi.fn(async () => ({ data: rows, error: null }));
  const admin = {
    rpc,
    from: () => ({
      update: (patch: Record<string, unknown>) => ({ eq: async (_c: string, id: string) => { updates.push({ id, patch }); return { error: null }; } }),
    }),
  } as unknown as SupabaseClient;
  return { admin, updates, rpc };
}

const row = (over = {}) => ({
  id: 'o1', to_email: 'a@b.com', template: 'booking_confirmed', attempts: 0,
  payload: { classTitle: 'Taller', date: '2026-11-23' }, ...over,
});

describe('dispatchOutbox', () => {
  it('envía los pendientes y los marca como enviados', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    const { admin, updates } = makeAdmin([row()]);
    expect(await dispatchOutbox(admin)).toEqual({ sent: 1, failed: 0, skipped: 0 });
    expect(updates[0]).toMatchObject({ id: 'o1', patch: { status: 'sent', attempts: 1 } });
  });

  it('si falla, deja el correo pendiente con el error y suma el intento', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' });
    const { admin, updates } = makeAdmin([row()]);
    expect(await dispatchOutbox(admin)).toEqual({ sent: 0, failed: 1, skipped: 0 });
    expect(updates[0].patch).toMatchObject({ status: 'pending', attempts: 1 });
    expect(String(updates[0].patch.last_error)).toContain('500');
  });

  it('al quinto intento fallido lo marca como fallido', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' });
    const { admin, updates } = makeAdmin([row({ attempts: 4 })]);
    await dispatchOutbox(admin);
    expect(updates[0].patch).toMatchObject({ status: 'failed', attempts: 5 });
  });

  it('sin configurar devuelve el correo a la cola sin gastar un intento', async () => {
    delete process.env.RESEND_API_KEY;
    const { admin, updates } = makeAdmin([row({ attempts: 2 })]);
    expect(await dispatchOutbox(admin)).toEqual({ sent: 0, failed: 0, skipped: 1 });
    expect(updates).toHaveLength(1);
    expect(updates[0].patch).toMatchObject({ status: 'pending', attempts: 2, claimed_at: null });
  });

  it('reclama los correos de forma atómica con el límite pedido (sin duplicar envíos)', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    const { admin, rpc } = makeAdmin([]);
    await dispatchOutbox(admin, 7);
    expect(rpc).toHaveBeenCalledWith('claim_email_outbox', { p_limit: 7 });
  });

  it('una plantilla rota se marca como fallida sin detener a las demás', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    const { admin, updates } = makeAdmin([row({ id: 'bad', template: 'nope' }), row({ id: 'ok' })]);
    expect(await dispatchOutbox(admin)).toEqual({ sent: 1, failed: 1, skipped: 0 });
    expect(updates.find(u => u.id === 'bad')?.patch).toMatchObject({ status: 'failed' });
    expect(updates.find(u => u.id === 'ok')?.patch).toMatchObject({ status: 'sent' });
  });
});
