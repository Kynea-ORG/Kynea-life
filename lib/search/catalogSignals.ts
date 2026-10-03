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
const MAX_QUICK_PROMPTS = 4;

// Un prompt por tipo de intención, en orden de prioridad; se toman los
// primeros MAX_QUICK_PROMPTS que el catálogo respalde.
export function buildAiSuggestions(s: CatalogSignals): AiSuggestions {
  const quick: string[] = [];
  const place: string[] = [NEUTRAL_PLACEHOLDER];

  if (s.hasWellness) {
    quick.push('🧘 Quiero desestresarme bailando');
    place.push('Quiero soltar el estrés bailando…');
  } else if (s.hasEvening) {
    quick.push('🧘 Algo para después del trabajo');
  }

  if (s.beginnerStyle) {
    quick.push(`💃 Quiero aprender ${s.beginnerStyle} desde cero`);
    place.push('Nunca he bailado, ¿por dónde empiezo?');
  }
  if (s.beginnerPair) {
    place.push(`${s.beginnerPair.style} para principiantes en ${s.beginnerPair.district}…`);
  }

  if (s.hasKids) {
    quick.push(s.hasKidsWeekend ? '👧 Algo para mis niños el fin de semana' : '👧 Una clase para mis niños');
    place.push('Una clase para mis niños…');
  }

  if (s.topPair) {
    quick.push(`📍 Quiero bailar ${s.topPair.style} en ${s.topPair.district}`);
  }

  if (s.hasEnergy) quick.push('⚡ Algo para subir la energía');

  if (s.hasEvening) place.push('Algo para después del trabajo…');
  if (s.hasSaturdayMorning) place.push('Algo los sábados en la mañana…');
  if (s.hasEconomic) place.push('Algo baratito para empezar…');

  return {
    quickPrompts: quick.slice(0, MAX_QUICK_PROMPTS),
    placeholders: [...new Set(place)],
  };
}
