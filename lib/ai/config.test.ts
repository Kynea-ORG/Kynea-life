// lib/ai/config.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAiConfig, isAiConfigured } from './config';

describe('AI Config Resolver (Agnóstico)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.AI_PROVIDER;
    delete process.env.AI_API_KEY;
    delete process.env.AI_SEARCH_MODEL;
    delete process.env.AI_EMBEDDING_MODEL;
    delete process.env.AI_BASE_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('retorna provider none cuando no hay variables configuradas', () => {
    const config = getAiConfig();
    expect(config.provider).toBe('none');
    expect(config.apiKey).toBeNull();
    expect(isAiConfigured()).toBe(false);
  });

  it('asume OpenAI por defecto si se provee AI_API_KEY sin AI_PROVIDER', () => {
    process.env.AI_API_KEY = 'sk-test-key';
    const config = getAiConfig();
    expect(config.provider).toBe('openai');
    expect(config.apiKey).toBe('sk-test-key');
    expect(config.searchModel).toBe('gpt-6-luna');
    expect(config.embeddingModel).toBe('text-embedding-3-small');
    expect(config.baseUrl).toBe('https://api.openai.com/v1');
    expect(isAiConfigured()).toBe(true);
  });

  it('respeta AI_PROVIDER=openai explícito con AI_API_KEY y modelos personalizados', () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_API_KEY = 'sk-custom';
    process.env.AI_SEARCH_MODEL = 'gpt-6-luna';
    process.env.AI_EMBEDDING_MODEL = 'text-embedding-3-small';

    const config = getAiConfig();
    expect(config.provider).toBe('openai');
    expect(config.apiKey).toBe('sk-custom');
    expect(config.searchModel).toBe('gpt-6-luna');
    expect(config.embeddingModel).toBe('text-embedding-3-small');
    expect(isAiConfigured()).toBe(true);
  });

  it('soporta AI_PROVIDER=openai-compatible con AI_BASE_URL personalizada (ej. OpenRouter)', () => {
    process.env.AI_PROVIDER = 'openai-compatible';
    process.env.AI_API_KEY = 'sk-or-test';
    process.env.AI_BASE_URL = 'https://openrouter.ai/api/v1';
    process.env.AI_SEARCH_MODEL = 'anthropic/claude-3.5-haiku';
    process.env.AI_EMBEDDING_MODEL = 'openai/text-embedding-3-small';

    const config = getAiConfig();
    expect(config.provider).toBe('openai-compatible');
    expect(config.apiKey).toBe('sk-or-test');
    expect(config.baseUrl).toBe('https://openrouter.ai/api/v1');
    expect(config.searchModel).toBe('anthropic/claude-3.5-haiku');
    expect(config.embeddingModel).toBe('openai/text-embedding-3-small');
    expect(isAiConfigured()).toBe(true);
  });

  it('soporta AI_PROVIDER=gemini con AI_API_KEY y defaults de Gemini', () => {
    process.env.AI_PROVIDER = 'gemini';
    process.env.AI_API_KEY = 'gemini-key';

    const config = getAiConfig();
    expect(config.provider).toBe('gemini');
    expect(config.apiKey).toBe('gemini-key');
    expect(config.searchModel).toBe('gemini-2.5-flash-lite');
    expect(config.embeddingModel).toBe('gemini-embedding-001');
    expect(config.baseUrl).toBe('https://generativelanguage.googleapis.com/v1beta/models');
    expect(isAiConfigured()).toBe(true);
  });
});
