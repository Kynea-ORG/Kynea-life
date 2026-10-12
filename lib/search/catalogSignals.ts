// lib/search/catalogSignals.ts
//
// Lo que Kynea realmente tiene publicado, resumido para dos usos:
//  1. Sugerencias del buscador (placeholders y chips): solo se ofrece algo
//     que sabemos que devuelve resultados.
//  2. Contexto del prompt de Gemini: estilos, distritos y niveles reales.
//
// Las condiciones tipo "para niños", "post-trabajo" o "principiantes" se
// verifican con getValidClassBadges — la misma regla que usa la búsqueda
// para validar resultados — así una sugerencia y su resultado nunca discrepan.
import { getValidClassBadges } from '@/lib/ai/badges';
import { generateDynamicDaySuggestions } from '@/lib/ai/gemini';
import { getPublicClient } from '@/lib/supabase/public';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DanceClass } from '@/lib/types';

export interface CatalogSignals {
  totalClasses: number;
  styles: { name: string; count: number }[];
  districts: { name: string; count: number }[];
  levels: string[];
  /** Estilo + distrito con clases de nivel inicial; el par más frecuente. */
  beginnerPair: { style: string; district: string } | null;
  /** Estilo más frecuente entre las clases de nivel inicial. */
  beginnerStyle: string | null;
  /** Estilo + distrito más frecuente en general. */
  topPair: { style: string; district: string } | null;
  hasWellness: boolean;
  hasEnergy: boolean;
  hasEvening: boolean;
  hasKids: boolean;
  hasKidsWeekend: boolean;
  hasSaturdayMorning: boolean;
  hasEconomic: boolean;
}

function stylesOf(c: DanceClass): string[] {
  return [...new Set([c.style, ...(c.secondaryStyles ?? [])].map(s => s?.trim()).filter(Boolean))];
}

function rank(counter: Map<string, number>): { name: string; count: number }[] {
  return [...counter.entries()]
    .map(([name, count]) => ({ name, count }))
    // Desempate por nombre para que el resultado sea determinista.
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function bump(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function topPairOf(classes: DanceClass[]): { style: string; district: string } | null {
  const pairs = new Map<string, number>();
  for (const c of classes) {
    const district = c.district?.trim();
    if (!district) continue;
    for (const style of stylesOf(c)) bump(pairs, `${style}\u0000${district}`);
  }
  const best = rank(pairs)[0];
  if (!best) return null;
  const [style, district] = best.name.split('\u0000');
  return { style, district };
}

function topStyleOf(classes: DanceClass[]): string | null {
  const counter = new Map<string, number>();
  for (const c of classes) for (const s of stylesOf(c)) bump(counter, s);
  return rank(counter)[0]?.name ?? null;
}

const passes = (c: DanceClass, badge: string) => getValidClassBadges(c, [badge]).length > 0;

export function computeCatalogSignals(classes: DanceClass[]): CatalogSignals {
  const styleCount = new Map<string, number>();
  const districtCount = new Map<string, number>();
  const levels = new Set<string>();

  for (const c of classes) {
    for (const s of stylesOf(c)) bump(styleCount, s);
    const d = c.district?.trim();
    if (d) bump(districtCount, d);
    const l = c.level?.trim();
    if (l) levels.add(l);
  }

  const beginners = classes.filter(c => passes(c, 'Para principiantes'));
  const kids = classes.filter(c => passes(c, 'Para niños'));

  return {
    totalClasses: classes.length,
    styles: rank(styleCount),
    districts: rank(districtCount),
    levels: [...levels].sort((a, b) => a.localeCompare(b)),
    beginnerPair: topPairOf(beginners),
    beginnerStyle: topStyleOf(beginners),
    topPair: topPairOf(classes),
    hasWellness: classes.some(c => passes(c, 'Desestresante')),
    hasEnergy: classes.some(c => passes(c, 'Energizante')),
    hasEvening: classes.some(c => passes(c, 'Post-trabajo')),
    hasKids: kids.length > 0,
    hasKidsWeekend: kids.some(c => passes(c, 'Fin de semana')),
    hasSaturdayMorning: classes.some(c => passes(c, 'Sábados') && passes(c, 'Mañanas')),
    hasEconomic: classes.some(c => passes(c, 'Económico')),
  };
}

export interface AiSuggestions {
  /** Textos que rotan en el input. El primero es el estático del primer paint. */
  placeholders: string[];
  /** Chips clicables: se envían tal cual como consulta. */
  quickPrompts: string[];
}

export const NEUTRAL_PLACEHOLDER = 'Cuéntame qué tienes en mente…';
export const MAX_QUICK_PROMPTS = 5;

export function getTodayLimaDateStr(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(date);
}

export function getTodayWeekdayName(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('es-PE', { weekday: 'long', timeZone: 'America/Lima' });
  const day = formatter.format(date);
  return day.charAt(0).toUpperCase() + day.slice(1);
}

export function getClassesForToday(classes: DanceClass[], dayName?: string): DanceClass[] {
  const targetDay = (dayName ?? getTodayWeekdayName()).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return classes.filter(c =>
    (c.timeSlots ?? []).some(slot =>
      slot.days?.some(d =>
        d.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === targetDay
      )
    )
  );
}

// Un prompt por tipo de intención, en orden de prioridad; se toman los
// primeros MAX_QUICK_PROMPTS que el catálogo respalde.
export function buildAiSuggestions(s: CatalogSignals): AiSuggestions {
  const quick: string[] = [];
  const place: string[] = [NEUTRAL_PLACEHOLDER];

  if (s.hasWellness) {
    quick.push('🧘 Desestresarme bailando');
    place.push('Quiero soltar el estrés bailando…');
  } else if (s.hasEvening) {
    quick.push('🧘 Algo para después del trabajo');
  }

  if (s.beginnerStyle) {
    quick.push(`💃 Aprender ${s.beginnerStyle} desde cero`);
    place.push('Nunca he bailado, ¿por dónde empiezo?');
  }
  if (s.beginnerPair) {
    place.push(`${s.beginnerPair.style} para principiantes en ${s.beginnerPair.district}…`);
  }

  if (s.hasKids) {
    quick.push(s.hasKidsWeekend ? '👧 Clases para mis niños el fin de semana' : '👧 Clases para mis niños');
    place.push('Una clase para mis niños…');
  }

  if (s.topPair) {
    quick.push(`📍 Bailar ${s.topPair.style} en ${s.topPair.district}`);
  }

  if (s.hasEnergy) quick.push('⚡ Subir la energía bailando');

  if (s.hasEvening) place.push('Algo para después del trabajo…');
  if (s.hasSaturdayMorning) place.push('Algo los sábados en la mañana…');
  if (s.hasEconomic) place.push('Algo baratito para empezar…');

  if (s.totalClasses > 0 && !quick.some(p => p.toLowerCase().includes('salsa') || p.toLowerCase().includes('bachata'))) {
    quick.push('🕺 Salsa o bachata este fin de semana');
  }

  return {
    quickPrompts: quick.slice(0, MAX_QUICK_PROMPTS),
    placeholders: [...new Set(place)],
  };
}

/**
 * Consulta la base de datos para obtener las sugerencias cacheadas del día.
 */
export async function fetchDailySuggestionsFromDb(
  client?: SupabaseClient | null,
  dateStr: string = getTodayLimaDateStr()
): Promise<AiSuggestions | null> {
  try {
    const sb = client ?? getPublicClient();
    const { data, error } = await sb
      .from('daily_search_suggestions')
      .select('quick_prompts, placeholders')
      .eq('suggestion_date', dateStr)
      .maybeSingle();

    if (error || !data) return null;

    const quick = Array.isArray(data.quick_prompts) ? (data.quick_prompts as string[]) : [];
    const placeholders = Array.isArray(data.placeholders) ? (data.placeholders as string[]) : [];

    if (quick.length === 0) return null;

    return {
      quickPrompts: quick.slice(0, MAX_QUICK_PROMPTS),
      placeholders: placeholders.length > 0 ? placeholders : [NEUTRAL_PLACEHOLDER],
    };
  } catch {
    return null;
  }
}

/**
 * Guarda las sugerencias generadas del día en la base de datos de forma atómica.
 */
export async function saveDailySuggestionsToDb(
  suggestions: AiSuggestions,
  client?: SupabaseClient | null,
  dateStr: string = getTodayLimaDateStr(),
  weekday: string = getTodayWeekdayName()
): Promise<void> {
  try {
    const sb = client ?? getPublicClient();
    await sb.rpc('save_daily_search_suggestions', {
      p_date: dateStr,
      p_weekday: weekday,
      p_quick_prompts: suggestions.quickPrompts,
      p_placeholders: suggestions.placeholders,
    });
  } catch (err) {
    console.error('[catalogSignals] Error saving daily suggestions:', err);
  }
}

/**
 * Genera sugerencias de búsqueda con IA dinámicas según las clases que hay en el día de hoy.
 * 1. Lee primero desde la base de datos (0ms y $0 para visitas subsecuentes del día).
 * 2. Si es la primera visita del día, genera con Gemini y guarda el resultado en PostgreSQL.
 * 3. En caso de fallo de IA o de BD, degrada silenciosamente a las sugerencias deterministas del catálogo.
 */
export async function generateCatalogAiSuggestions(
  classes: DanceClass[],
  supabase?: SupabaseClient | null,
  options?: { force?: boolean }
): Promise<AiSuggestions> {
  const todayDateStr = getTodayLimaDateStr();
  const todayWeekday = getTodayWeekdayName();

  // 1. Verificamos si ya existen sugerencias guardadas en la base de datos para hoy
  if (!options?.force) {
    const cachedFromDb = await fetchDailySuggestionsFromDb(supabase, todayDateStr);
    if (cachedFromDb) {
      return cachedFromDb;
    }
  }

  // 2. Si no existen aún para hoy, generamos según las clases programadas para hoy
  const todayClasses = getClassesForToday(classes, todayWeekday);
  const targetClasses = todayClasses.length >= 2 ? todayClasses : classes;
  const signals = computeCatalogSignals(targetClasses);

  const styles = signals.styles.map(s => s.name);
  const districts = signals.districts.map(d => d.name);
  const levels = signals.levels;

  const aiGenerated = await generateDynamicDaySuggestions({
    todayWeekday,
    styles,
    districts,
    levels,
    hasEvening: signals.hasEvening,
    hasMorning: signals.hasSaturdayMorning || targetClasses.some(c => (c.timeSlots ?? []).some(t => {
      const h = parseInt(t.startTime?.split(':')[0] ?? '12', 10);
      return h >= 6 && h < 12;
    })),
    hasKids: signals.hasKids,
    hasBeginners: Boolean(signals.beginnerStyle || signals.beginnerPair),
  }).catch(() => null);

  const baseSuggestions = buildAiSuggestions(signals);

  const finalSuggestions: AiSuggestions = (aiGenerated && aiGenerated.length >= 3)
    ? {
        placeholders: baseSuggestions.placeholders,
        quickPrompts: aiGenerated.slice(0, MAX_QUICK_PROMPTS),
      }
    : baseSuggestions;

  // 3. Persistimos de forma atómica en PostgreSQL para que las próximas visitas del día tarden 0ms
  if (finalSuggestions.quickPrompts.length > 0) {
    await saveDailySuggestionsToDb(finalSuggestions, supabase, todayDateStr, todayWeekday);
  }

  return finalSuggestions;
}
