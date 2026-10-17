// lib/ai/config.ts

export type AiProviderType = 'openai' | 'gemini' | 'openai-compatible' | 'none';

export interface AiConfig {
  provider: AiProviderType;
  apiKey: string | null;
  searchModel: string;
  embeddingModel: string;
  baseUrl: string;
}

/**
 * Resuelve la configuración del motor de IA de forma 100% agnóstica al proveedor.
 *
 * Variables de entorno requeridas:
 * - AI_PROVIDER: 'openai' | 'gemini' | 'openai-compatible'
 * - AI_API_KEY: Clave de la API universal
 *
 * Variables opcionales:
 * - AI_SEARCH_MODEL: Modelo para el parsing de búsqueda (default según proveedor)
 * - AI_EMBEDDING_MODEL: Modelo de embeddings (default según proveedor)
 * - AI_BASE_URL: URL base de la API (default según proveedor)
 */
export function getAiConfig(): AiConfig {
  const explicitProvider = process.env.AI_PROVIDER?.trim().toLowerCase() as AiProviderType | undefined;
  const apiKey = process.env.AI_API_KEY?.trim() || null;

  let provider: AiProviderType = 'none';

  if (explicitProvider && ['openai', 'gemini', 'openai-compatible'].includes(explicitProvider)) {
    provider = explicitProvider;
  } else if (apiKey) {
    // Si hay AI_API_KEY pero no se especificó AI_PROVIDER, asume openai por defecto
    provider = 'openai';
  }

  const isGemini = provider === 'gemini';
  const defaultBaseUrl = isGemini
    ? 'https://generativelanguage.googleapis.com/v1beta/models'
    : 'https://api.openai.com/v1';

  const defaultSearchModel = isGemini ? 'gemini-2.5-flash-lite' : 'gpt-6-luna';
  const defaultEmbeddingModel = isGemini ? 'gemini-embedding-001' : 'text-embedding-3-small';

  const baseUrl = process.env.AI_BASE_URL?.trim() || defaultBaseUrl;
  const searchModel = process.env.AI_SEARCH_MODEL?.trim() || defaultSearchModel;
  const embeddingModel = process.env.AI_EMBEDDING_MODEL?.trim() || defaultEmbeddingModel;

  return {
    provider,
    apiKey,
    searchModel,
    embeddingModel,
    baseUrl,
  };
}

/**
 * Retorna true si hay un proveedor de IA configurado con API key activa.
 */
export function isAiConfigured(): boolean {
  const config = getAiConfig();
  return config.provider !== 'none' && Boolean(config.apiKey);
}
