import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import * as catalogSignals from '@/lib/search/catalogSignals';
import * as classesQueries from '@/lib/classes/queries';
import * as supabasePublic from '@/lib/supabase/public';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('GET /api/cron/daily-suggestions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    vi.spyOn(supabasePublic, 'getPublicClient').mockReturnValue({} as unknown as SupabaseClient);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rechaza con 401 si CRON_SECRET está configurado y el token no coincide', async () => {
    process.env.CRON_SECRET = 'secret123';
    const req = new NextRequest('http://localhost:3000/api/cron/daily-suggestions', {
      headers: { authorization: 'Bearer wrong_token' },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('No autorizado');
  });

  it('permite ejecución si el token coincide con CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'secret123';
    vi.spyOn(catalogSignals, 'fetchDailySuggestionsFromDb').mockResolvedValue({
      quickPrompts: ['🕺 Salsa'],
      placeholders: ['Buscar...'],
    });

    const req = new NextRequest('http://localhost:3000/api/cron/daily-suggestions', {
      headers: { authorization: 'Bearer secret123' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.status).toBe('already_cached');
  });

  it('genera y persiste cuando no hay sugerencias cacheadas', async () => {
    vi.spyOn(catalogSignals, 'fetchDailySuggestionsFromDb').mockResolvedValue(null);
    vi.spyOn(classesQueries, 'fetchPublishedClasses').mockResolvedValue([]);
    vi.spyOn(catalogSignals, 'generateCatalogAiSuggestions').mockResolvedValue({
      quickPrompts: ['🔥 Bachata hoy'],
      placeholders: ['Placeholder'],
    });

    const req = new NextRequest('http://localhost:3000/api/cron/daily-suggestions');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.status).toBe('generated_and_saved');
    expect(json.suggestions.quickPrompts).toEqual(['🔥 Bachata hoy']);
  });

  it('fuerza regeneración si se envía ?force=true aunque existan en BD', async () => {
    vi.spyOn(catalogSignals, 'fetchDailySuggestionsFromDb').mockResolvedValue({
      quickPrompts: ['Previo'],
      placeholders: ['Previo'],
    });
    vi.spyOn(classesQueries, 'fetchPublishedClasses').mockResolvedValue([]);
    const generateSpy = vi.spyOn(catalogSignals, 'generateCatalogAiSuggestions').mockResolvedValue({
      quickPrompts: ['Regenerado'],
      placeholders: ['Regenerado'],
    });

    const req = new NextRequest('http://localhost:3000/api/cron/daily-suggestions?force=true');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('generated_and_saved');
    expect(generateSpy).toHaveBeenCalledWith([], expect.anything(), { force: true, city: 'Lima' });
  });
});
