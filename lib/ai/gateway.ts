// lib/ai/gateway.ts
import type { AiSearchInterpretation } from './types';
import { getAiConfig } from './config';
import * as gemini from './gemini';
import * as openai from './openai';

export {
  MAX_SEARCH_QUERY_LENGTH,
  sanitizeSearchQuery,
  buildSystemPrompt,
} from './gemini';

/**
 * Limpia las memorias caché TTL de todos los proveedores configurados.
 */
export function clearAiCache(): void {
  gemini.clearAiCache();
  openai.clearOpenAiCache();
}

/**
 * Genera el vector embedding (768 dimensiones) usando el proveedor de IA activo.
 * - Si AI_PROVIDER es 'openai' o 'openai-compatible': usa text-embedding-3-small (dimensions: 768).
 * - En cualquier otro caso: usa Gemini (text-embedding-004 / gemini-embedding-001).
 * Falla silenciosamente devolviendo null si no hay API key o hay un error.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const config = getAiConfig();
  if (config.provider === 'openai' || config.provider === 'openai-compatible') {
    return openai.generateEmbedding(text);
  }

  return gemini.generateEmbedding(text);
}

/**
 * Genera embeddings en lote usando el proveedor de IA activo.
 */
export async function batchGenerateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  const config = getAiConfig();
  if (config.provider === 'openai' || config.provider === 'openai-compatible') {
    return openai.batchGenerateEmbeddings(texts);
  }

  return gemini.batchGenerateEmbeddings(texts);
}

/**
 * Interpreta una consulta en lenguaje natural y extrae filtros relacionales estructurados
 * usando el proveedor de IA activo (OpenAI con GPT-6 Luna o Gemini con Flash).
 */
export async function parseSearchQuery(
  query: string,
  options?: {
    danceStyles?: string[];
    districts?: string[];
    levels?: string[];
  }
): Promise<AiSearchInterpretation | null> {
  const config = getAiConfig();
  if (config.provider === 'openai' || config.provider === 'openai-compatible') {
    return openai.parseSearchQuery(query, options);
  }

  return gemini.parseSearchQuery(query, options);
}

/**
 * Genera dinámicamente sugerencias rápidas de búsqueda para el día de hoy
 * usando el proveedor de IA activo.
 */
export async function generateDynamicDaySuggestions(params: {
  todayWeekday: string;
  styles: string[];
  districts: string[];
  levels: string[];
  hasEvening?: boolean;
  hasMorning?: boolean;
  hasKids?: boolean;
  hasBeginners?: boolean;
}): Promise<string[] | null> {
  const config = getAiConfig();
  if (config.provider === 'openai' || config.provider === 'openai-compatible') {
    return openai.generateDynamicDaySuggestions(params);
  }

  return gemini.generateDynamicDaySuggestions(params);
}
