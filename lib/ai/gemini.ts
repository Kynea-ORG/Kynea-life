// lib/ai/gemini.ts
import type { AiSearchInterpretation } from './types';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function getApiKey(): string | null {
  return process.env.GEMINI_API_KEY || null;
}

const EMBEDDING_MODELS = ['gemini-embedding-001', 'gemini-embedding-2'];

/**
 * Límite estricto de caracteres para consultas de búsqueda en lenguaje natural.
 * 120 caracteres (~20 palabras) es suficiente para cualquier búsqueda en lenguaje natural
 * y bloquea ataques de token-overflow, inyecciones extensas y payloads maliciosos.
 */
export const MAX_SEARCH_QUERY_LENGTH = 120;

/**
 * Sanitiza y trunca la consulta para mitigar ataques de inyección, caracteres de control
 * no imprimibles y repetición abusiva de caracteres.
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';
  return query
    .replace(/[\x00-\x1F\x7F]/g, '') // Eliminar caracteres de control ASCII
    .replace(/([?!.,;:_/\\]){2,}/g, '$1') // Colapsar puntuación repetida abusiva
    .replace(/\s+/g, ' ') // Colapsar espacios múltiples
    .trim()
    .slice(0, MAX_SEARCH_QUERY_LENGTH);
}

// In-Memory TTL Cache (2 horas de vida, máximo 500 entradas para prevenir memory leaks)
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

const queryInterpretationCache = new Map<string, CacheEntry<AiSearchInterpretation | null>>();
const embeddingCache = new Map<string, CacheEntry<number[] | null>>();

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

export function clearAiCache(): void {
  queryInterpretationCache.clear();
  embeddingCache.clear();
}

/**
 * Genera el vector embedding (768 dimensiones) para un texto usando gemini-embedding-001 / gemini-embedding-2.
 * Consulta primero el cache en memoria antes de consumir la API externa.
 * Falla silenciosamente devolviendo null si la API key no existe o hay un error.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const sanitized = sanitizeSearchQuery(text);
  const apiKey = getApiKey();
  if (!apiKey || !sanitized) return null;

  const cacheKey = sanitized.toLowerCase();
  const cached = getFromCache(embeddingCache, cacheKey);
  if (cached !== undefined) return cached;

  for (const model of EMBEDDING_MODELS) {
    try {
      const url = `${GEMINI_BASE_URL}/${model}:embedContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${model}`,
          content: {
            parts: [{ text: sanitized }],
          },
          outputDimensionality: 768,
        }),
      });

      if (!res.ok) {
        continue;
      }

      const data = await res.json();
      const values = data?.embedding?.values;
      if (Array.isArray(values) && values.length > 0) {
        const result = values as number[];
        setInCache(embeddingCache, cacheKey, result);
        return result;
      }
    } catch (err) {
      console.warn(`[gemini:generateEmbedding] Error with ${model}:`, err);
    }
  }

  return null;
}

/**
 * Genera embeddings en lote para múltiples textos (máximo 100 por petición).
 */
export async function batchGenerateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  const apiKey = getApiKey();
  if (!apiKey || !texts.length) return texts.map(() => null);

  for (const model of EMBEDDING_MODELS) {
    try {
      const url = `${GEMINI_BASE_URL}/${model}:batchEmbedContents?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: texts.map(t => ({
            model: `models/${model}`,
            content: { parts: [{ text: t.trim() || 'clase de baile' }] },
            outputDimensionality: 768,
          })),
        }),
      });

      if (!res.ok) {
        continue;
      }

      const data = await res.json();
      const embeddings = data?.embeddings;
      if (Array.isArray(embeddings)) {
        return embeddings.map(e => (Array.isArray(e?.values) ? (e.values as number[]) : null));
      }
    } catch (err) {
      console.warn(`[gemini:batchGenerateEmbeddings] Error with ${model}:`, err);
    }
  }

  return texts.map(() => null);
}


const SEARCH_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    filters: {
      type: 'OBJECT',
      properties: {
        style: { type: 'STRING', nullable: true },
        district: { type: 'STRING', nullable: true },
        city: { type: 'STRING', nullable: true },
        maxPrice: { type: 'NUMBER', nullable: true },
        daysOfWeek: {
          type: 'ARRAY',
          items: { type: 'INTEGER' },
          nullable: true,
        },
        modality: { type: 'STRING', enum: ['Presencial', 'Online'], nullable: true },
        level: { type: 'STRING', nullable: true },
        ageGroup: { type: 'STRING', nullable: true },
        timeOfDay: {
          type: 'STRING',
          enum: ['morning', 'afternoon', 'evening', 'night'],
          nullable: true,
        },
      },
    },
    semanticQuery: { type: 'STRING' },
    aiSummary: { type: 'STRING' },
    matchBadges: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    isDirectProfileSearch: { type: 'BOOLEAN' },
    profileTarget: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING' },
        role: { type: 'STRING', enum: ['profesor', 'academia'] },
      },
      nullable: true,
    },
  },
  required: ['semanticQuery', 'aiSummary', 'matchBadges', 'isDirectProfileSearch'],
};

function buildSystemPrompt(knownStyles?: string[], knownDistricts?: string[]): string {
  const stylesHint = knownStyles?.length
    ? `\nEstilos disponibles en Kynea: ${knownStyles.join(', ')}.`
    : '';
  const districtsHint = knownDistricts?.length
    ? `\nDistritos comunes en Lima / Perú: ${knownDistricts.join(', ')}.`
    : '';

  return `Eres el motor de búsqueda inteligente de Kynea, la plataforma líder de clases de baile en Perú.
Tu objetivo es interpretar consultas de usuarios en lenguaje natural y extraer una estructura JSON precisa:

1. "filters": Filtros relacionales:
   - style: Nombre del estilo de baile reconocido.
   - district: Distrito en Lima o ciudad.
   - city: Ciudad (default "Lima" si el distrito es de Lima).
   - maxPrice: Precio máximo numérico en Soles.
   - daysOfWeek: Array de enteros donde 0=Lunes, 1=Martes, 2=Miércoles, 3=Jueves, 4=Viernes, 5=Sábado, 6=Domingo.
   - modality: "Presencial" u "Online".
   - level: "Principiante", "Intermedio", "Avanzado".
   - ageGroup: "Niños" (solo si pide infantil/chibolos), "Adultos".
   - timeOfDay: "morning" (mañanas / antes del trabajo / 06:00 - 11:59), "afternoon" (tardes / 12:00 - 17:59), "evening" (noches / después del trabajo / post-trabajo / >= 18:00).
2. "semanticQuery": Frase densa y descriptiva para búsqueda semántica vectorial (ej. "clases desestresantes soltar el cuerpo relajacion liberar estres iniciacion principiante").
3. "aiSummary": Resumen conciso, elegante y natural en español de lo que el usuario busca (ej. "Clases desestresantes para principiantes en horario nocturno después del trabajo").
4. "matchBadges": Hasta 3 etiquetas cortas y verificables extraídas de la taxonomía estándar.
5. "isDirectProfileSearch": true únicamente si la búsqueda es el nombre exacto de un profesor o academia reconocida.

${stylesHint}${districtsHint}

CONTEXTO LABORAL Y HORARIOS EN PERÚ (LIMA):
- Jornada laboral estándar: En Lima, el horario de oficina/trabajo ("chamba") es de Lunes a Viernes de 8:00 AM / 9:00 AM a 6:00 PM / 7:00 PM.
- "después del trabajo", "después de la chamba", "post-trabajo", "after office", "en la noche", "nocturno":
  * Corresponde ESTRICTAMENTE a horario nocturno entre semana: a partir de las 18:00 hrs (6:00 PM) en adelante.
  * JAMÁS interpretar clases de la mañana (ej. 7:00 AM) como después del trabajo.
  * Asignar: timeOfDay = "evening", badge = "Post-trabajo" o "Horario nocturno".
- "antes del trabajo", "antes de la oficina", "mañanero", "temprano", "en la mañana":
  * Corresponde a clases matutinas entre 06:00 AM y 11:59 AM.
  * Asignar: timeOfDay = "morning", badge = "Mañanas".
- "este finde", "fin de semana", "sábado", "domingo":
  * daysOfWeek = [5, 6], badge = "Fin de semana".
- "chibolos", "peques", "niños", "para mis hijos":
  * ageGroup = "Niños", badge = "Para niños". NUNCA asociar a clases nocturnas (>= 20:00).
- "barato", "baratito", "económico":
  * maxPrice = 35 o 40, badge = "Económico".
- "desestresarme", "soltar el cuerpo", "desconectar", "relajarme", "liberar tensiones":
  * semanticQuery debe priorizar bienestar, soltar tensiones y diversión; badge = "Desestresante".
- "sin ritmo", "dos pies izquierdos", "para tímidos", "cero experiencia", "iniciación", "desde cero":
  * level = "Principiante", badge = "Para principiantes" o "Desde cero".
- "salsita", "bachatita":
  * style = "Salsa", "Bachata".

TAXONOMÍA ESTÁNDAR DE BADGES (Usa únicamente nombres consistentes con estos):
- Horario: "Post-trabajo", "Horario nocturno", "Mañanas", "Fin de semana".
- Nivel: "Para principiantes", "Desde cero".
- Precio: "Económico", "< S/ 50".
- Edad: "Para niños", "Solo adultos".
- Beneficio: "Desestresante", "Cardio / Fitness".
NO generes badges que contradigan el horario real de la jornada laboral peruana.

Responde estrictamente con el JSON solicitado.`;
}

/**
 * Interpreta la consulta del usuario con Gemini Flash y devuelve la estructura de búsqueda.
 * Aplica sanitización, límite de 120 caracteres y consulta previa a cache en memoria.
 */
export async function parseSearchQuery(
  query: string,
  options?: { danceStyles?: string[]; districts?: string[] }
): Promise<AiSearchInterpretation | null> {
  const sanitized = sanitizeSearchQuery(query);
  const apiKey = getApiKey();
  if (!apiKey || !sanitized) return null;

  const cacheKey = sanitized.toLowerCase();
  const cached = getFromCache(queryInterpretationCache, cacheKey);
  if (cached !== undefined) return cached;

  const modelsToTry = [
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
  ];

  const systemPrompt = buildSystemPrompt(options?.danceStyles, options?.districts);

  for (const model of modelsToTry) {
    try {
      const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: sanitized }],
            },
          ],
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: SEARCH_RESPONSE_SCHEMA,
            temperature: 0.1,
          },
        }),
      });

      if (!res.ok) {
        // If model doesn't exist or 404, try next fallback model
        if (res.status === 404 || res.status === 400) {
          continue;
        }
        console.warn(`[gemini:parseSearchQuery] Model ${model} returned HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const parsed = JSON.parse(rawText) as AiSearchInterpretation;
      const result: AiSearchInterpretation = {
        filters: parsed.filters ?? {},
        semanticQuery: sanitizeSearchQuery(parsed.semanticQuery ?? sanitized),
        aiSummary: parsed.aiSummary ?? `Resultados para "${sanitized}"`,
        matchBadges: Array.isArray(parsed.matchBadges) ? parsed.matchBadges.slice(0, 3) : [],
        isDirectProfileSearch: Boolean(parsed.isDirectProfileSearch),
        profileTarget: parsed.profileTarget ?? null,
      };
      setInCache(queryInterpretationCache, cacheKey, result);
      return result;
    } catch (err) {
      console.warn(`[gemini:parseSearchQuery] Error with model ${model}:`, err);
    }
  }

  return null;
}
