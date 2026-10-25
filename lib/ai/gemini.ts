// lib/ai/gemini.ts
import type { AiSearchInterpretation } from './types';
import { checkQueryDomain } from './domainGuard';

const GEMINI_BASE_URL = process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models';

function getApiKey(): string | null {
  return process.env.AI_API_KEY || null;
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

export function clearAiCache(): void {
  queryInterpretationCache.clear();
  embeddingCache.clear();
  dynamicSuggestionsCache.clear();
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
    isOutOfDomain: {
      type: 'BOOLEAN',
    },
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
  required: ['isOutOfDomain', 'semanticQuery', 'aiSummary', 'matchBadges', 'isDirectProfileSearch'],
};

export function buildSystemPrompt(
  knownStyles?: string[],
  knownDistricts?: string[],
  knownLevels?: string[],
  currentDateContext?: { dateStr: string; weekdayName: string; kyneaDayIndex: number; timeZone?: string }
): string {
  const hints: string[] = [];
  if (knownStyles?.length) hints.push(`Estilos con clases publicadas ahora en Kynea: ${knownStyles.join(', ')}.`);
  if (knownDistricts?.length) hints.push(`Distritos con clases publicadas ahora: ${knownDistricts.join(', ')}.`);
  if (knownLevels?.length) hints.push(`Niveles que existen: ${knownLevels.join(', ')}.`);
  const catalogHint = hints.length
    ? `\nCATÁLOGO REAL (lo único que podemos ofrecer hoy):\n${hints.join('\n')}\n` +
      'En filters.style, filters.district y filters.level usa EXACTAMENTE uno de esos nombres (corrige tildes, diminutivos y apodos al nombre de la lista). ' +
      'Si lo que pide el usuario NO está en la lista (un estilo, distrito o nivel que no ofrecemos), NO lo pongas en filters: ' +
      'déjalo fuera y descríbelo en semanticQuery para que la búsqueda semántica encuentre lo más parecido.\n'
    : '';

  const tzLabel = currentDateContext?.timeZone ? `Zona horaria: ${currentDateContext.timeZone}` : 'Zona horaria: America/Lima';
  const dateContextHint = currentDateContext
    ? `\nFECHA Y HORA ACTUAL (${tzLabel}):
Hoy es ${currentDateContext.weekdayName} (${currentDateContext.dateStr}).
Índice de día para hoy en daysOfWeek: [${currentDateContext.kyneaDayIndex}] (donde 0=Lunes, 1=Martes, 2=Miércoles, 3=Jueves, 4=Viernes, 5=Sábado, 6=Domingo).
Si el usuario dice "hoy", "esta noche", "hoy día", "más tarde", DEBES asignar daysOfWeek = [${currentDateContext.kyneaDayIndex}].\n`
    : '';

  return `Eres el motor de búsqueda inteligente de Kynea, la primera plataforma integral de danza en Latinoamérica.
Tu objetivo es interpretar consultas de usuarios en lenguaje natural y extraer una estructura JSON precisa:
${dateContextHint}
1. "isOutOfDomain": Booleano de pertenencia al dominio de Kynea:
   - true: Únicamente si la consulta NO guarda ninguna relación con el baile, danza, movimiento corporal, música bailable, academias o profesores de baile (ej. preguntas de programación informática como "¿qué es json?", recetas de cocina, tareas de matemáticas, medicina, mecánica, finanzas, política).
   - false: Si la consulta busca clases de baile, estilos, profesores, academias, horarios, niveles, música bailable o metas de bienestar físico/emocional a través del baile, sin importar la ciudad, país o región que mencione.
2. "filters": Filtros relacionales (debe ser {} si isOutOfDomain es true):
   - style: Nombre del estilo de baile reconocido.
   - district: Distrito o zona específica.
   - city: Ciudad o país mencionado si el usuario lo especifica (default "Lima" únicamente si el distrito mencionado pertenece a Lima; null si el usuario no especifica ciudad, país ni distrito).
   - maxPrice: Precio máximo numérico en Soles.
   - daysOfWeek: Array de enteros donde 0=Lunes, 1=Martes, 2=Miércoles, 3=Jueves, 4=Viernes, 5=Sábado, 6=Domingo.
   - modality: "Presencial" u "Online".
   - level: "Principiante", "Intermedio", "Avanzado".
   - ageGroup: "Niños" (solo si pide infantil/chibolos), "Adultos".
   - timeOfDay: "morning" (mañanas / antes del trabajo / 06:00 - 11:59), "afternoon" (tardes / 12:00 - 17:59), "evening" (noches / después del trabajo / post-trabajo / >= 18:00).
3. "semanticQuery": Frase densa y descriptiva para búsqueda semántica vectorial (cadena vacía "" si isOutOfDomain es true).
4. "aiSummary": Resumen conciso, elegante y natural en español de lo que el usuario busca.
   - Si la consulta es de baile en otra ciudad o país donde aún no hay clases activas (ej. Chile, Colombia, Argentina, etc.): resume amablemente lo que busca (ej. "Buscas clases de Flamenco en Chile."). NUNCA digas que Kynea es "exclusiva para Perú" ni "solo para Perú".
   - Si isOutOfDomain es true: debe indicar cortésmente que Kynea es una plataforma dedicada a la danza y el baile y que no se encontraron clases para esa consulta.
5. "matchBadges": Hasta 3 etiquetas cortas y verificables extraídas de la taxonomía estándar (array vacío [] si isOutOfDomain es true. JAMÁS inventes tags fuera de baile como "Educativo", "Tecnología", etc.).
6. "isDirectProfileSearch": true únicamente si la búsqueda es el nombre exacto de un profesor o academia reconocida.

${catalogHint}

REGLAS CRÍTICAS DE DOMINIO Y ALCANCE:
- ALCANCE GEOGRÁFICO: Kynea prioriza la danza en Latinoamérica. Aunque hoy la mayoría de clases presenciales activas se encuentran en Perú (donde nació la plataforma), NO es exclusiva de Perú.
- JAMÁS afirmes que Kynea es "exclusiva para Perú" o "solo disponible en Perú".
- Si el usuario busca clases de baile en otro país o ciudad (ej. "flamenco en chile"): la consulta SÍ pertenece a Kynea (isOutOfDomain = false). Extrae style: "Flamenco", city: "Chile" y resume con naturalidad.
- Si la consulta es ajena al baile (isOutOfDomain = true), NO intentes forzar relaciones ni inventar etiquetas como "Educativo" o "Aprendizaje". Asigna filters: {}, matchBadges: [], semanticQuery: "".

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
  options?: {
    danceStyles?: string[];
    districts?: string[];
    levels?: string[];
    userTimezone?: string;
  }
): Promise<AiSearchInterpretation | null> {
  const sanitized = sanitizeSearchQuery(query);
  const apiKey = getApiKey();
  if (!apiKey || !sanitized) return null;

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

  // Guarda de Dominio de Alta Precisión: si la consulta es inequívocamente ajena al baile
  // (ej. "que es json", "sql", recetas, etc.), respondemos de inmediato en 0ms y $0 costo
  const domainCheck = checkQueryDomain(sanitized, options?.danceStyles);
  if (domainCheck.isDefinitelyOutOfDomain) {
    const outResult: AiSearchInterpretation = {
      isOutOfDomain: true,
      filters: {},
      semanticQuery: '',
      aiSummary: 'No encontramos clases de baile para esta búsqueda. Kynea es una plataforma dedicada a la danza y el baile. Te invitamos a explorar nuestros estilos disponibles.',
      matchBadges: [],
      isDirectProfileSearch: false,
      profileTarget: null,
    };
    setInCache(queryInterpretationCache, cacheKey, outResult);
    return outResult;
  }

  const modelsToTry = [
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
  ];

  const systemPrompt = buildSystemPrompt(
    options?.danceStyles,
    options?.districts,
    options?.levels,
    { dateStr, weekdayName, kyneaDayIndex, timeZone }
  );

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
      const isOutOfDomain = Boolean(parsed.isOutOfDomain);
      const rawFilters = isOutOfDomain ? {} : (parsed.filters ?? {});
      const filters = { ...rawFilters };

      // Si el LLM confundió el grupo etario con el nivel (ej. level: 'Adultos'), corregir a ageGroup
      if (filters.level) {
        const l = filters.level.toLowerCase();
        if (l.includes('adult') || l.includes('niñ') || l.includes('kid') || l.includes('chibolo')) {
          if (!filters.ageGroup) {
            filters.ageGroup = l.includes('adult') ? 'Adultos' : 'Niños';
          }
          delete filters.level;
        }
      }

      const result: AiSearchInterpretation = {
        isOutOfDomain,
        filters,
        semanticQuery: isOutOfDomain ? '' : sanitizeSearchQuery(parsed.semanticQuery ?? sanitized),
        aiSummary: isOutOfDomain
          ? 'No encontramos clases de baile para esta búsqueda. Kynea es una plataforma dedicada a la danza y el baile. Te invitamos a explorar nuestros estilos disponibles.'
          : (parsed.aiSummary ?? `Resultados para "${sanitized}"`),
        matchBadges: isOutOfDomain ? [] : (Array.isArray(parsed.matchBadges) ? parsed.matchBadges.slice(0, 3) : []),
        isDirectProfileSearch: isOutOfDomain ? false : Boolean(parsed.isDirectProfileSearch),
        profileTarget: isOutOfDomain ? null : (parsed.profileTarget ?? null),
      };
      setInCache(queryInterpretationCache, cacheKey, result);
      return result;
    } catch (err) {
      console.warn(`[gemini:parseSearchQuery] Error with model ${model}:`, err);
    }
  }

  return null;
}

/**
 * Genera con Gemini 5 sugerencias de búsqueda rápida personalizadas para el día de hoy,
 * basadas en los estilos, distritos y clases que realmente se imparten hoy en Kynea.
 */
export async function generateDynamicDaySuggestions(params: {
  todayWeekday: string;
  city?: string;
  hour?: number;
  isTomorrow?: boolean;
  targetWeekday?: string;
  styles: string[];
  districts: string[];
  levels: string[];
  realCombinations?: string[];
  hasEvening?: boolean;
  hasMorning?: boolean;
  hasKids?: boolean;
  hasBeginners?: boolean;
}): Promise<string[] | null> {
  const apiKey = getApiKey();
  if (!apiKey || params.styles.length === 0) return null;

  const targetCity = params.city || 'Lima';
  const targetHour = params.hour ?? new Date().getHours();
  const dateStr = new Date().toISOString().slice(0, 10);
  const targetDayLabel = params.isTomorrow ? `tomorrow-${params.targetWeekday || 'next'}` : params.todayWeekday.toLowerCase();
  const cacheKey = `${targetCity.toLowerCase()}::${dateStr}::${targetHour}::${targetDayLabel}::${params.styles.slice(0, 5).join(',')}`;
  const cached = getFromCache(dynamicSuggestionsCache, cacheKey);
  if (cached !== undefined) return cached;

  const modelsToTry = [
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
  ];

  const isOnline = targetCity === 'Online';
  const combosHint = (!isOnline && params.realCombinations?.length)
    ? `\nCOMBINACIONES REALES VERIFICADAS PARA EL DÍA OBJETIVO (SOLO combina estilos y distritos de esta lista):\n${params.realCombinations.map(c => `- ${c}`).join('\n')}\n`
    : '';

  const onlineGuidance = isOnline
    ? '\nIMPORTANTE: El usuario busca clases desde cualquier lugar. Genera sugerencias orientadas a clases virtuales/online, soltar el cuerpo desde casa o aprender estilos populares (ej. "💃 Clases online de Heels para principiantes", "✨ Soltar el cuerpo y bailar desde casa", "🕺 Bachata virtual"). NO menciones distritos presenciales.\n'
    : '';

  const ruleLocation = isOnline
    ? 'NO menciones distritos ni sedes físicas (enfócate en modalidad online, virtual, o bailar desde casa).'
    : 'Si mencionas estilo y distrito juntos en la misma frase, DEBE ser una de las COMBINACIONES REALES VERIFICADAS de la lista. JAMÁS inventes que un estilo se dicta en un distrito si no está en la lista de combinaciones reales.';

  const isLateNight = Boolean(params.isTomorrow || targetHour >= 23);
  const targetDayName = params.targetWeekday || (isLateNight ? 'mañana' : params.todayWeekday);

  const prompt = isLateNight
    ? `Eres el generador de sugerencias de búsqueda de Kynea, la primera plataforma integral de danza en Latinoamérica.
Son las ${targetHour}:00 (11:00 pm o noche avanzada). Las academias ya cerraron por hoy.
Por lo tanto, tus sugerencias deben enfocarse en MAÑANA ${targetDayName}, en el fin de semana o en aprender estilos desde cero.
Clases programadas para mañana ${targetDayName}:
- Estilos con clases: ${params.styles.slice(0, 8).join(', ')}.
${!isOnline ? `- Distritos con clases: ${params.districts.slice(0, 6).join(', ')}.\n` : ''}${combosHint}${onlineGuidance}- Niveles disponibles: ${params.levels.slice(0, 4).join(', ') || 'Principiante, Intermedio'}.
${params.hasEvening ? '- Hay clases disponibles en la tarde/noche.' : ''}
${params.hasMorning ? '- Hay clases disponibles en la mañana.' : ''}
${params.hasKids ? '- Hay clases infantiles / para niños.' : ''}
${params.hasBeginners ? '- Hay opciones para principiantes / desde cero.' : ''}

Genera exactamente 5 sugerencias de búsqueda rápida atractivas, variadas y naturales para los usuarios que exploran clases a esta hora de la noche.
Reglas estrictas de tiempo y formato:
1. Cada una debe comenzar con UN solo emoji representativo (ej. 💃, 🕺, ✨, 🔥, 🧘).
2. Son las ${targetHour}:00. Está ESTRICTAMENTE PROHIBIDO decir "hoy", "esta noche" o mencionar horas del día de hoy (como "a las 6pm").
3. Las sugerencias con día deben decir "mañana" o "mañana ${targetDayName.toLowerCase()}" o "este fin de semana", o ser búsquedas atemporales (ej. '💃 Salsa en Miraflores mañana', '🔥 Bachata principiante este fin de semana', '🧘 Soltar el estrés bailando').
4. ${ruleLocation}
5. JAMÁS menciones horas numéricas fijas (como 'a las 6pm').
6. Longitud entre 25 y 55 caracteres.

Responde únicamente un JSON con formato: {"suggestions": ["...", "..."]}`
    : `Eres el generador de sugerencias de búsqueda de Kynea, la primera plataforma integral de danza en Latinoamérica.
Hoy es ${params.todayWeekday}. Hora actual: exactamente las ${targetHour}:00.
Clases programadas para hoy:
- Estilos con clases hoy: ${params.styles.slice(0, 8).join(', ')}.
${!isOnline ? `- Distritos con clases hoy: ${params.districts.slice(0, 6).join(', ')}.\n` : ''}${combosHint}${onlineGuidance}- Niveles disponibles: ${params.levels.slice(0, 4).join(', ') || 'Principiante, Intermedio'}.
${params.hasEvening ? '- Hay clases disponibles más tarde en la noche.' : ''}
${params.hasMorning ? '- Hay clases disponibles en la mañana.' : ''}
${params.hasKids ? '- Hay clases infantiles / para niños.' : ''}
${params.hasBeginners ? '- Hay opciones para principiantes / desde cero.' : ''}

Genera exactamente 5 sugerencias de búsqueda rápida atractivas, variadas y naturales para los usuarios que buscan bailar hoy ${params.todayWeekday}.
Reglas estrictas de tiempo y formato:
1. Cada una debe comenzar con UN solo emoji representativo (ej. 💃, 🕺, ✨, 🔥, 🧘).
2. Son las ${targetHour}:00. JAMÁS menciones horas o momentos del día que ya hayan pasado respecto a las ${targetHour}:00 (por ejemplo, si son las ${targetHour}:00, está ESTRICTAMENTE PROHIBIDO decir horas pasadas como 'a las 6pm' o 'en la mañana').
3. JAMÁS inventes horas numéricas fijas (como 'a las 6pm'). Si te refieres a un momento, usa 'esta tarde', 'esta noche' o 'más tarde' únicamente si aún no ha ocurrido hoy.
4. ${ruleLocation}
5. Longitud entre 25 y 55 caracteres.

Responde únicamente un JSON con formato: {"suggestions": ["...", "..."]}`;

  for (const model of modelsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        }),
      });
      clearTimeout(timeoutId);

      if (!res.ok) continue;

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const parsed = JSON.parse(rawText);
      const suggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : null;
      if (Array.isArray(suggestions) && suggestions.length >= 3) {
        const clean = suggestions
          .filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0)
          .map((s: string) => s.trim().slice(0, 60))
          .slice(0, 5);

        if (clean.length >= 3) {
          setInCache(dynamicSuggestionsCache, cacheKey, clean);
          return clean;
        }
      }
    } catch {
      // Intentar el siguiente modelo o fallback silencioso
    }
  }

  return null;
}
