// lib/ai/gateway.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as gateway from './gateway';
import * as openai from './openai';
import * as gemini from './gemini';

describe('AI Gateway (Provider-Agnostic Router)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('enruta a OpenAI cuando AI_PROVIDER es openai', async () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_API_KEY = 'sk-mock';

    const openaiSpy = vi.spyOn(openai, 'parseSearchQuery').mockResolvedValueOnce({
      filters: { style: 'Salsa' },
      semanticQuery: 'salsa',
      aiSummary: 'OpenAI search',
      matchBadges: [],
      isDirectProfileSearch: false,
    });
    const geminiSpy = vi.spyOn(gemini, 'parseSearchQuery');

    const result = await gateway.parseSearchQuery('salsa');
    expect(openaiSpy).toHaveBeenCalled();
    expect(geminiSpy).not.toHaveBeenCalled();
    expect(result?.aiSummary).toBe('OpenAI search');
  });

  it('enruta a Gemini cuando AI_PROVIDER es gemini', async () => {
    process.env.AI_PROVIDER = 'gemini';
    process.env.AI_API_KEY = 'gemini-key';

    const openaiSpy = vi.spyOn(openai, 'parseSearchQuery');
    const geminiSpy = vi.spyOn(gemini, 'parseSearchQuery').mockResolvedValueOnce({
      filters: { style: 'Bachata' },
      semanticQuery: 'bachata',
      aiSummary: 'Gemini search',
      matchBadges: [],
      isDirectProfileSearch: false,
    });

    const result = await gateway.parseSearchQuery('bachata');
    expect(geminiSpy).toHaveBeenCalled();
    expect(openaiSpy).not.toHaveBeenCalled();
    expect(result?.aiSummary).toBe('Gemini search');
  });

  it('enruta embeddings a OpenAI cuando AI_PROVIDER es openai', async () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_API_KEY = 'sk-mock';

    const mockVec = new Array(768).fill(0.99);
    vi.spyOn(openai, 'generateEmbedding').mockResolvedValueOnce(mockVec);
    const geminiSpy = vi.spyOn(gemini, 'generateEmbedding');

    const result = await gateway.generateEmbedding('kizomba');
    expect(result).toEqual(mockVec);
    expect(geminiSpy).not.toHaveBeenCalled();
  });

  it('limpia las cachés de ambos proveedores con clearAiCache', () => {
    const openaiClear = vi.spyOn(openai, 'clearOpenAiCache');
    const geminiClear = vi.spyOn(gemini, 'clearAiCache');

    gateway.clearAiCache();
    expect(openaiClear).toHaveBeenCalled();
    expect(geminiClear).toHaveBeenCalled();
  });
});
