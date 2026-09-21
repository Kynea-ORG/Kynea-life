// lib/ai/gemini.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateEmbedding,
  parseSearchQuery,
  sanitizeSearchQuery,
  clearAiCache,
  MAX_SEARCH_QUERY_LENGTH,
} from './gemini';

describe('Gemini AI Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    clearAiCache();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    clearAiCache();
    vi.restoreAllMocks();
  });

  describe('generateEmbedding', () => {
    it('retorna null silenciosamente si no hay GEMINI_API_KEY configurada', async () => {
      delete process.env.GEMINI_API_KEY;
      const result = await generateEmbedding('salsa cubana');
      expect(result).toBeNull();
    });

    it('retorna null si el texto está vacío', async () => {
      process.env.GEMINI_API_KEY = 'mock-key';
      const result = await generateEmbedding('   ');
      expect(result).toBeNull();
    });

    it('extrae el array de valores flotantes de la respuesta de text-embedding-004', async () => {
      process.env.GEMINI_API_KEY = 'mock-key';
      const mockVector = new Array(768).fill(0.05);

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          embedding: { values: mockVector },
        }),
      } as Response);

      const result = await generateEmbedding('salsa cubana');
      expect(result).toEqual(mockVector);
      expect(result?.length).toBe(768);
    });

    it('retorna null y no arroja error si la API responde con error HTTP', async () => {
      process.env.GEMINI_API_KEY = 'mock-key';

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'API key invalid',
      } as Response);

      const result = await generateEmbedding('salsa cubana');
      expect(result).toBeNull();
    });
  });

  describe('parseSearchQuery', () => {
    it('retorna null si no hay GEMINI_API_KEY configurada', async () => {
      delete process.env.GEMINI_API_KEY;
      const result = await parseSearchQuery('bachata en miraflores');
      expect(result).toBeNull();
    });

    it('retorna null si la query está vacía', async () => {
      process.env.GEMINI_API_KEY = 'mock-key';
      const result = await parseSearchQuery('   ');
      expect(result).toBeNull();
    });

    it('interpreta correctamente la respuesta JSON estructurada con filtros y badges', async () => {
      process.env.GEMINI_API_KEY = 'mock-key';

      const mockAiPayload = {
        filters: {
          style: 'Salsa',
          district: 'Lince',
          daysOfWeek: [5, 6],
          maxPrice: 40,
          ageGroup: 'kids',
        },
        semanticQuery: 'salsa principiantes iniciacion ninos ritmo basico',
        aiSummary: 'Clases accesibles de salsa para niños en Lince los fines de semana',
        matchBadges: ['Para niños', 'Económico', 'Fin de semana'],
        isDirectProfileSearch: false,
        profileTarget: null,
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify(mockAiPayload) }],
              },
            },
          ],
        }),
      } as Response);

      const result = await parseSearchQuery('salsita en lince pa chibolos este finde baratito');
      expect(result).not.toBeNull();
      expect(result?.filters.style).toBe('Salsa');
      expect(result?.filters.district).toBe('Lince');
      expect(result?.filters.daysOfWeek).toEqual([5, 6]);
      expect(result?.filters.maxPrice).toBe(40);
      expect(result?.matchBadges).toEqual(['Para niños', 'Económico', 'Fin de semana']);
      expect(result?.aiSummary).toContain('Lince');
    });

    it('maneja fallos de la API degradando a null sin romper la ejecución', async () => {
      process.env.GEMINI_API_KEY = 'mock-key';

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as Response);

      const result = await parseSearchQuery('bachata sensual');
      expect(result).toBeNull();
    });

    it('utiliza cache en memoria y no vuelve a llamar a la API para la misma consulta', async () => {
      process.env.GEMINI_API_KEY = 'mock-key';

      const mockAiPayload = {
        filters: { style: 'Salsa' },
        semanticQuery: 'salsa iniciacion',
        aiSummary: 'Clases de salsa',
        matchBadges: ['Para principiantes'],
        isDirectProfileSearch: false,
        profileTarget: null,
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify(mockAiPayload) }] } }],
        }),
      } as Response);

      const first = await parseSearchQuery('salsa para principiantes');
      const second = await parseSearchQuery('  salsa   para principiantes  ');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(first).toEqual(second);
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('trunca consultas a MAX_SEARCH_QUERY_LENGTH (120 caracteres)', () => {
      const longQuery = 'a'.repeat(200);
      const sanitized = sanitizeSearchQuery(longQuery);
      expect(sanitized.length).toBe(MAX_SEARCH_QUERY_LENGTH);
      expect(sanitized.length).toBe(120);
    });

    it('elimina caracteres de control ASCII y colapsa espacios y puntuación excesiva', () => {
      const dirty = '\x00\x1F  quiero salsa????? en miraflores!!!!!   \x7F';
      const clean = sanitizeSearchQuery(dirty);
      expect(clean).toBe('quiero salsa? en miraflores!');
    });

    it('retorna string vacío si la entrada es nula o vacía', () => {
      expect(sanitizeSearchQuery('')).toBe('');
      expect(sanitizeSearchQuery('   ')).toBe('');
    });
  });
});
