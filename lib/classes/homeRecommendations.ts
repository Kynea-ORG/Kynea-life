import { getTodayLima } from './helpers';
import type { DanceClass } from '@/lib/types';

// FNV-1a — deterministic, fast, no dependency. Only used to turn
// `${seed}:${classId}` into a stable sort key, never for anything security-
// sensitive.
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface HomeRecommendationOptions {
  /** Defaults to today's date in Lima time — same result for every visitor
   * on a given calendar day, different the next. Override only in tests. */
  seed?: string;
  maxPerTeacher?: number;
  poolSize?: number;
  limit?: number;
}

// "Clases de baile para ti" (Home) — sin esto, un profesor que publica
// muchas clases seguidas se queda con todo el carrusel, siempre en el mismo
// orden (published_at desc, sin límite). Ver Notion: "Home: 'Clases de baile
// para ti' con mezcla y rotación (evitar repetidas)".
//
// Mecanismo, en 3 pasos — server-side, sin cookies ni tracking por usuario:
//  1. "Recientes": `classes` ya viene ordenado por published_at desc
//     (fetchPublishedClasses) — se toma un pool de las `poolSize` más
//     recientes. Es la única señal de "relevancia" real disponible hoy sin
//     un sistema de personalización: lo más nuevo que sigue vigente.
//  2. Tope por profesor dentro de ese pool (`maxPerTeacher`), preservando el
//     orden de recencia de cada profesor entre sí.
//  3. Reordenado determinístico por semilla del día — mismo resultado para
//     todos los visitantes de un mismo día calendario (cacheable, no rompe
//     TTFB), distinto al día siguiente. No hay supresión explícita de "ya
//     te mostré esto" por visitante — necesitaría sesión/cookie — pero el
//     pool siendo más grande que `limit` y rotando a diario ya evita que se
//     vea exactamente lo mismo dos días seguidos.
export function selectHomeRecommendedClasses(
  classes: DanceClass[],
  opts: HomeRecommendationOptions = {}
): DanceClass[] {
  const { seed = getTodayLima(), maxPerTeacher = 2, poolSize = 30, limit = 12 } = opts;

  const pool = classes.slice(0, poolSize);

  const perTeacherCount = new Map<string, number>();
  const capped: DanceClass[] = [];
  for (const cls of pool) {
    const count = perTeacherCount.get(cls.teacher.id) ?? 0;
    if (count >= maxPerTeacher) continue;
    perTeacherCount.set(cls.teacher.id, count + 1);
    capped.push(cls);
  }

  const shuffled = [...capped].sort(
    (a, b) => hashString(`${seed}:${a.id}`) - hashString(`${seed}:${b.id}`)
  );

  return shuffled.slice(0, limit);
}
