// lib/ai/openai.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateEmbedding,
  batchGenerateEmbeddings,
  parseSearchQuery,
  generateDynamicDaySuggestions,
  clearOpenAiCache,
} from './openai';

describe('OpenAI Client (Agnostic / GPT-6 Luna & text-embedding-3-small)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    clearOpenAiCache();
    process.env = { ...originalEnv };
    delete process.env.AI_API_KEY;
    delete process.env.AI_PROVIDER;
  });

  afterEach(() => {
    process.env = originalEnv;
    clearOpenAiCache();
    vi.restoreAllMocks();
  });

  describe('generateEmbedding', () => {
    it('retorna null si no hay API key configurada', async () => {
      delete process.env.AI_API_KEY;
      delete process.env.AI_PROVIDER;

      const result = await generateEmbedding('salsa cubana');
      expect(result).toBeNull();
    });

    it('retorna null si el texto está vacío', async () => {
      process.env.AI_API_KEY = 'sk-mock-key';
      process.env.AI_PROVIDER = 'openai';
      const result = await generateEmbedding('   ');
      expect(result).toBeNull();
    });

    it('llama a /embeddings con dimensions: 768 y extrae el vector', async () => {
      process.env.AI_API_KEY = 'sk-mock-key';
      process.env.AI_PROVIDER = 'openai';
      const mockVector = new Array(768).fill(0.0123);

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockVector, index: 0 }],
        }),
      } as Response);

      const result = await generateEmbedding('bachata sensual');
      expect(result).toEqual(mockVector);
      expect(result?.length).toBe(768);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-mock-key',
          }),
          body: expect.stringContaining('"dimensions":768'),
        })
      );
    });

    it('retorna null silenciosamente si la API responde con error HTTP', async () => {
      process.env.AI_API_KEY = 'sk-mock-key';
      process.env.AI_PROVIDER = 'openai';

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      } as Response);

      const result = await generateEmbedding('salsa caleña');
      expect(result).toBeNull();
    });
  });

  describe('batchGenerateEmbeddings', () => {
    it('genera embeddings en lote para múltiples textos', async () => {
      process.env.AI_API_KEY = 'sk-mock-key';
      process.env.AI_PROVIDER = 'openai';
      const vectorA = new Array(768).fill(0.1);
      const vectorB = new Array(768).fill(0.2);

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { embedding: vectorA, index: 0 },
            { embedding: vectorB, index: 1 },
          ],
        }),
      } as Response);

      const results = await batchGenerateEmbeddings(['salsa', 'bachata']);
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(vectorA);
      expect(results[1]).toEqual(vectorB);
    });
  });

  describe('parseSearchQuery', () => {
    it('retorna null si no hay API key', async () => {
      delete process.env.AI_API_KEY;

      const result = await parseSearchQuery('salsa en miraflores');
      expect(result).toBeNull();
    });

    it('aplica Domain Guard de inmediato en 0ms para consultas fuera de dominio', async () => {
      process.env.AI_API_KEY = 'sk-mock-key';
      process.env.AI_PROVIDER = 'openai';
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const result = await parseSearchQuery('que es un loop for en python');
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(result?.isOutOfDomain).toBe(true);
      expect(result?.semanticQuery).toBe('');
    });

    it('interpreta la consulta con Structured Outputs y cascada de modelos', async () => {
      process.env.AI_API_KEY = 'sk-mock-key';
      process.env.AI_PROVIDER = 'openai';
      process.env.AI_SEARCH_MODEL = 'gpt-6-luna';

      const mockPayload = {
        isOutOfDomain: false,
        filters: {
          style: 'Salsa',
          district: 'Miraflores',
          city: 'Lima',
          maxPrice: 50,
          daysOfWeek: [5],
          modality: 'Presencial',
          level: 'Principiante',
          ageGroup: null,
          timeOfDay: 'evening',
        },
        semanticQuery: 'salsa principiantes miraflores noche viernes',
        aiSummary: 'Clases presenciales de salsa para principiantes en Miraflores los viernes en la noche',
        matchBadges: ['Principiante', 'Noche', 'Miraflores'],
        isDirectProfileSearch: false,
        profileTarget: null,
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockPayload) } }],
        }),
      } as Response);

      const result = await parseSearchQuery('salsa principiantes en miraflores viernes noche max 50 soles');
      expect(result).toEqual(mockPayload);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"strict":true'),
        })
      );
    });

    it('hace fallback a gpt-4o-mini si gpt-6-luna retorna 404', async () => {
      process.env.AI_API_KEY = 'sk-mock-key';
      process.env.AI_PROVIDER = 'openai';
      process.env.AI_SEARCH_MODEL = 'gpt-6-luna';

      const mockPayload = {
        isOutOfDomain: false,
        filters: { style: 'Bachata' },
        semanticQuery: 'bachata',
        aiSummary: 'Buscando bachata',
        matchBadges: [],
        isDirectProfileSearch: false,
        profileTarget: null,
      };

      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: async () => 'Model not found',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: JSON.stringify(mockPayload) } }],
          }),
        } as Response);

      const result = await parseSearchQuery('bachata');
      expect(result?.semanticQuery).toBe('bachata');
    });
  });

  describe('generateDynamicDaySuggestions', () => {
    it('genera sugerencias dinámicas usando schema JSON', async () => {
      process.env.AI_API_KEY = 'sk-mock-key';
      process.env.AI_PROVIDER = 'openai';

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  suggestions: [
                    '💃 Salsa cubana hoy en Miraflores',
                    '🔥 Bachata principiante en Surco',
                    '✨ Desestresarme hoy en la noche',
                  ],
                }),
              },
            },
          ],
        }),
      } as Response);

      const suggestions = await generateDynamicDaySuggestions({
        todayWeekday: 'Viernes',
        styles: ['Salsa', 'Bachata'],
        districts: ['Miraflores', 'Surco'],
        levels: ['Principiante'],
      });

      expect(suggestions).toHaveLength(3);
      expect(suggestions?.[0]).toContain('Salsa');
    });
  });
});
