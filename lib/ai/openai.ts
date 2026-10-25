// lib/ai/openai.ts
import type { AiSearchInterpretation } from './types';
import { checkQueryDomain } from './domainGuard';
import { getAiConfig } from './config';
import { buildSystemPrompt, sanitizeSearchQuery } from './gemini';

// In-Memory TTL Cache (2 horas de vida, máximo 500 entradas para prevenir memory leaks)
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

const queryInterpretationCache = new Map<string, CacheEntry<AiSearchInterpretation | null>>();
const embeddingCache = new Map<string, CacheEntry<number[] | null>>();
const dynamicSuggestionsCache = new Map<string, CacheEntry<string[]>>();

function getFromCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setInCache<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function clearOpenAiCache(): void {
  queryInterpretationCache.clear();
  embeddingCache.clear();
  dynamicSuggestionsCache.clear();
}

const OPENAI_SEARCH_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    isOutOfDomain: { type: 'boolean' },
    filters: {
      type: 'object',
      properties: {
        style: { type: ['string', 'null'] },
        district: { type: ['string', 'null'] },
        city: { type: ['string', 'null'] },
        maxPrice: { type: ['number', 'null'] },
        daysOfWeek: {
          type: ['array', 'null'],
          items: { type: 'integer' },
        },
        modality: {
          type: ['string', 'null'],
          enum: ['Presencial', 'Online', null],
        },
        level: { type: ['string', 'null'] },
        ageGroup: { type: ['string', 'null'] },
        timeOfDay: {
          type: ['string', 'null'],
          enum: ['morning', 'afternoon', 'evening', 'night', null],
        },
      },
      required: [
        'style',
        'district',
        'city',
        'maxPrice',
        'daysOfWeek',
        'modality',
        'level',
        'ageGroup',
        'timeOfDay',
      ],
      additionalProperties: false,
    },
    semanticQuery: { type: 'string' },
    aiSummary: { type: 'string' },
    matchBadges: {
      type: 'array',
      items: { type: 'string' },
    },
    isDirectProfileSearch: { type: 'boolean' },
    profileTarget: {
      type: ['object', 'null'],
      properties: {
        name: { type: 'string' },
        role: { type: 'string', enum: ['profesor', 'academia'] },
      },
      required: ['name', 'role'],
      additionalProperties: false,
    },
  },
  required: [
    'isOutOfDomain',
    'filters',
    'semanticQuery',
    'aiSummary',
    'matchBadges',
    'isDirectProfileSearch',
    'profileTarget',
  ],
  additionalProperties: false,
};

const OPENAI_SUGGESTIONS_SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['suggestions'],
  additionalProperties: false,
};

/**
 * Genera el vector embedding (768 dimensiones) usando text-embedding-3-small (o compatible).
 * Utiliza Matryoshka dimension reduction (dimensions: 768) para ser 100% compatible
 * con la columna pgvector vector(768) existente en Supabase.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const sanitized = sanitizeSearchQuery(text);
  const config = getAiConfig();
  if (!config.apiKey || !sanitized) return null;

  const cacheKey = sanitized.toLowerCase();
  const cached = getFromCache(embeddingCache, cacheKey);
  if (cached !== undefined) return cached;

  try {
    const url = `${config.baseUrl}/embeddings`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.embeddingModel,
        input: sanitized,
        dimensions: 768,
      }),
    });

    if (!res.ok) {
      console.warn(`[openai:generateEmbedding] Error HTTP ${res.status}:`, await res.text());
      return null;
    }

    const data = await res.json();
    const vector = data?.data?.[0]?.embedding;
    if (Array.isArray(vector) && vector.length === 768) {
      setInCache(embeddingCache, cacheKey, vector);
      return vector;
    }

    return null;
  } catch (err) {
    console.warn('[openai:generateEmbedding] Error inesperado:', err);
    return null;
  }
}

/**
 * Genera embeddings en lote para un conjunto de textos.
 */
export async function batchGenerateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  const config = getAiConfig();
  if (!config.apiKey || texts.length === 0) return texts.map(() => null);

  const sanitizedTexts = texts.map(t => sanitizeSearchQuery(t));
  const results: (number[] | null)[] = new Array(texts.length).fill(null);
  const missingIndices: number[] = [];
  const missingTexts: string[] = [];

  for (let i = 0; i < sanitizedTexts.length; i++) {
    const text = sanitizedTexts[i];
    if (!text) continue;
    const cached = getFromCache(embeddingCache, text.toLowerCase());
    if (cached !== undefined) {
      results[i] = cached;
    } else {
      missingIndices.push(i);
      missingTexts.push(text);
    }
  }

  if (missingTexts.length === 0) return results;

  try {
    const url = `${config.baseUrl}/embeddings`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.embeddingModel,
        input: missingTexts,
        dimensions: 768,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data)) {
        for (const item of data.data) {
          const index = missingIndices[item.index];
          const vector = item.embedding;
          if (index !== undefined && Array.isArray(vector) && vector.length === 768) {
            results[index] = vector;
            setInCache(embeddingCache, missingTexts[item.index].toLowerCase(), vector);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[openai:batchGenerateEmbeddings] Error:', err);
  }

  return results;
}

/**
 * Interpreta una consulta de búsqueda en lenguaje natural y genera filtros estructurados (JSON Schema)
 * mediante OpenAI (gpt-6-luna con fallback automático a gpt-4o-mini).
 */
export async function parseSearchQuery(
  query: string,
  options?: {
    danceStyles?: string[];
    districts?: string[];
    levels?: string[];
    userTimezone?: string;
  }
): Promise<AiSearchInterpretation | null> {
  const sanitized = sanitizeSearchQuery(query);
  const config = getAiConfig();
  if (!config.apiKey || !sanitized) return null;

  // Calcular la fecha y día actual según la zona horaria del usuario (o America/Lima por defecto)
  const now = new Date();
  const timeZone = options?.userTimezone?.trim() || 'America/Lima';
  let dateStr: string;
  let weekdayName: string;
  let kyneaDayIndex: number;
  try {
    dateStr = new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
    weekdayName = new Intl.DateTimeFormat('es-PE', { weekday: 'long', timeZone }).format(now);
    const jsDay = new Date(now.toLocaleString('en-US', { timeZone })).getDay();
    kyneaDayIndex = (jsDay + 6) % 7; // 0=Lunes, 1=Martes, ..., 5=Sábado, 6=Domingo
  } catch {
    const fallbackTz = 'America/Lima';
    dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: fallbackTz }).format(now);
    weekdayName = new Intl.DateTimeFormat('es-PE', { weekday: 'long', timeZone: fallbackTz }).format(now);
    const jsDay = new Date(now.toLocaleString('en-US', { timeZone: fallbackTz })).getDay();
    kyneaDayIndex = (jsDay + 6) % 7;
  }

  // Clave de caché particionada por texto, fecha y zona horaria para evitar
  // colisiones de días relativos (ej. "hoy", "esta noche") entre fechas o husos horarios
  const cacheKey = `${sanitized.toLowerCase()}::${dateStr}::${timeZone}`;
  const cached = getFromCache(queryInterpretationCache, cacheKey);
  if (cached !== undefined) return cached;

  // Guarda de Dominio: si la consulta es ajena al baile, responde de inmediato en 0ms y $0
  const domainCheck = checkQueryDomain(sanitized, options?.danceStyles);
  if (domainCheck.isDefinitelyOutOfDomain) {
    const outResult: AiSearchInterpretation = {
      isOutOfDomain: true,
      filters: {},
      semanticQuery: '',
      aiSummary:
        'No encontramos clases de baile para esta búsqueda. Kynea es una plataforma dedicada a la danza y el baile. Te invitamos a explorar nuestros estilos disponibles.',
      matchBadges: [],
      isDirectProfileSearch: false,
      profileTarget: null,
    };
    setInCache(queryInterpretationCache, cacheKey, outResult);
    return outResult;
  }

  // Cascada de modelos: intenta el configurado (gpt-6-luna), luego fallback a gpt-4o-mini
  const modelsToTry = [config.searchModel, 'gpt-6-luna', 'gpt-4o-mini'].filter(
    (v, i, a) => Boolean(v) && a.indexOf(v) === i
  );

  const systemPrompt = buildSystemPrompt(
    options?.danceStyles,
    options?.districts,
    options?.levels,
    { dateStr, weekdayName, kyneaDayIndex, timeZone }
  );

  for (const model of modelsToTry) {
    try {
      const url = `${config.baseUrl}/chat/completions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: sanitized },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'search_response',
              strict: true,
              schema: OPENAI_SEARCH_RESPONSE_SCHEMA,
            },
          },
          temperature: 0.1,
        }),
      });

      if (!res.ok) {
        // Si el modelo no existe o no está habilitado en la cuenta (404/400), prueba el siguiente
        if (res.status === 404 || res.status === 400) {
          continue;
        }
        console.warn(`[openai:parseSearchQuery] Model ${model} returned HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const rawText = data?.choices?.[0]?.message?.content;
      if (!rawText) continue;

      const parsed = JSON.parse(rawText) as AiSearchInterpretation;
      if (parsed.filters?.level) {
        const l = parsed.filters.level.toLowerCase();
        if (l.includes('adult') || l.includes('niñ') || l.includes('kid') || l.includes('chibolo')) {
          if (!parsed.filters.ageGroup) {
            parsed.filters.ageGroup = l.includes('adult') ? 'Adultos' : 'Niños';
          }
          parsed.filters.level = null;
        }
      }
      setInCache(queryInterpretationCache, cacheKey, parsed);
      return parsed;
    } catch (err) {
      console.warn(`[openai:parseSearchQuery] Error intentando con ${model}:`, err);
    }
  }

  return null;
}

/**
 * Genera con OpenAI 5 sugerencias de búsqueda rápida personalizadas para el día de hoy.
 */
export async function generateDynamicDaySuggestions(params: {
  todayWeekday: string;
  city?: string;
  hour?: number;
  styles: string[];
  districts: string[];
  levels: string[];
  realCombinations?: string[];
  hasEvening?: boolean;
  hasMorning?: boolean;
  hasKids?: boolean;
  hasBeginners?: boolean;
}): Promise<string[] | null> {
  const config = getAiConfig();
  if (!config.apiKey || params.styles.length === 0) return null;

  const targetCity = params.city || 'Lima';
  const targetHour = params.hour ?? new Date().getHours();
  const dateStr = new Date().toISOString().slice(0, 10);
  const cacheKey = `${targetCity.toLowerCase()}::${dateStr}::${targetHour}::${params.todayWeekday.toLowerCase()}::${params.styles.slice(0, 5).join(',')}`;
  const cached = getFromCache(dynamicSuggestionsCache, cacheKey);
  if (cached !== undefined) return cached;

  const modelsToTry = [config.searchModel, 'gpt-6-luna', 'gpt-4o-mini'].filter(
    (v, i, a) => Boolean(v) && a.indexOf(v) === i
  );

  const isOnline = targetCity === 'Online';
  const combosHint = (!isOnline && params.realCombinations?.length)
    ? `\nCOMBINACIONES REALES VERIFICADAS PARA HOY (SOLO combina estilos y distritos de esta lista):\n${params.realCombinations.map(c => `- ${c}`).join('\n')}\n`
    : '';

  const onlineGuidance = isOnline
    ? '\nIMPORTANTE: El usuario está buscando clases para tomar desde cualquier lugar. Genera sugerencias orientadas a clases virtuales/online, soltar el cuerpo desde casa o aprender estilos populares (ej. "💃 Clases online de Heels para principiantes", "✨ Soltar el cuerpo y bailar desde casa", "🕺 Bachata virtual este fin de semana"). NO menciones distritos presenciales.\n'
    : '';

  const rule3 = isOnline
    ? '3. NO menciones distritos ni sedes físicas (enfócate en modalidad online, virtual, o bailar desde casa).'
    : '3. Si mencionas estilo y distrito juntos en la misma frase, DEBE ser una de las COMBINACIONES REALES VERIFICADAS de la lista. JAMÁS inventes que un estilo se dicta en un distrito si no está en la lista de combinaciones reales.';

  const prompt = `Eres el generador de sugerencias de búsqueda de Kynea, la primera plataforma integral de danza en Latinoamérica.
Hoy es ${params.todayWeekday}.
Clases programadas para hoy:
- Estilos con clases hoy: ${params.styles.slice(0, 8).join(', ')}.
${!isOnline ? `- Distritos con clases hoy: ${params.districts.slice(0, 6).join(', ')}.\n` : ''}${combosHint}${onlineGuidance}- Niveles disponibles: ${params.levels.slice(0, 4).join(', ') || 'Principiante, Intermedio'}.
${params.hasEvening ? '- Hay clases disponibles en la noche después del trabajo (>= 18:00).' : ''}
${params.hasMorning ? '- Hay clases disponibles en la mañana.' : ''}
${params.hasKids ? '- Hay clases infantiles / para niños.' : ''}
${params.hasBeginners ? '- Hay opciones para principiantes / desde cero.' : ''}

Genera exactamente 5 sugerencias de búsqueda rápida atractivas, variadas y naturales para los usuarios que buscan bailar hoy ${params.todayWeekday}.
Reglas estrictas:
1. Cada una debe comenzar con UN solo emoji representativo (ej. 💃, 🕺, ✨, 🔥, 🧘).
2. Deben ser frases reales que un alumno escribiría para buscar (ej. '💃 Salsa cubana hoy en Miraflores', '🧘 Desestresarme hoy después del trabajo', '🔥 Bachata principiante hoy en Surco').
${rule3}
4. Longitud entre 25 y 55 caracteres.`;

  for (const model of modelsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const url = `${config.baseUrl}/chat/completions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'suggestions_response',
              strict: true,
              schema: OPENAI_SUGGESTIONS_SCHEMA,
            },
          },
          temperature: 0.3,
        }),
      });
      clearTimeout(timeoutId);

      if (!res.ok) continue;

      const data = await res.json();
      const rawText = data?.choices?.[0]?.message?.content;
      if (!rawText) continue;

      const parsed = JSON.parse(rawText) as { suggestions?: string[] };
      if (Array.isArray(parsed?.suggestions) && parsed.suggestions.length >= 3) {
        const clean = parsed.suggestions
          .filter(s => typeof s === 'string' && s.length >= 10 && s.length <= 80)
          .slice(0, 5);
        if (clean.length >= 3) {
          setInCache(dynamicSuggestionsCache, cacheKey, clean);
          return clean;
        }
      }
    } catch {
      // Intenta siguiente modelo
    }
  }

  return null;
}
