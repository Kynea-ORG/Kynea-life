// lib/ai/domainGuard.ts
//
// Validador de dominio para el motor de búsqueda de Kynea.
// Kynea es una plataforma integral para el ecosistema del baile y la danza en Latinoamérica.
// Esta guarda previene falsos positivos y falsos negativos al detectar consultas
// fuera de dominio (ej. programación, recetas, medicina, tareas escolares).

// 1. Estilos y verbos de baile inequívocos (máxima prioridad)
const CORE_DANCE_TERMS = [
  'bailar',
  'baile',
  'danzar',
  'danza',
  'academia',
  'academias',
  'profesor',
  'profesora',
  'profesores',
  'profesoras',
  'profe',
  'instructor',
  'instructora',
  'coreografia',
  'salsa',
  'bachata',
  'heels',
  'reggaeton',
  'hip hop',
  'hiphop',
  'ballet',
  'flamenco',
  'afro',
  'danzas arabes',
  'contemporaneo',
  'urbano',
  'k-pop',
  'kpop',
  'twerk',
  'dancehall',
  'cumbia',
  'tango',
  'marinera',
  'festejo',
  'jazz',
  'tap',
  'pole dance',
  'poledance',
  'zumba',
  'folklore',
  'folclor',
  'capoeira',
  'merengue',
  'chachacha',
  'kizomba',
  'house dance',
  'locking',
  'popping',
  'waacking',
  'voguing',
  'vogue',
];

// 2. Patrones inequívocos de dominios ajenos al baile
const OUT_OF_DOMAIN_PATTERNS: { regex: RegExp; category: string }[] = [
  // Tecnología, programación y software
  {
    regex: /\b(json|sql|mysql|postgresql|mongodb|python|javascript|typescript|react|html|css|php|java|c\+\+|rust|golang|docker|kubernetes|aws|azure|git|github|gitlab|npm|pip|api|apis|endpoint|endpoints|frontend|backend|fullstack|dataframe|machine learning|deep learning|algoritmo|algoritmos|compilador|debugging?|variable|variables|array|arrays|programar|programacion|desarrollo web|codigo fuente)\b|select\s+[\s\S]+\s+from/i,
    category: 'tecnología y programación',
  },
  // Ciencias duras y materias escolares académicas
  {
    regex: /\b(matematica|matematicas|fisica|quimica|algebra|geometria|calculo|derivada|derivadas|integral|integrales|trigonometria|ecuacion|ecuaciones|fotosintesis|celula|celulas|molecula|moleculas|atomo|atomos|termodinamica|mecanica cuantica|revolucion francesa|independencia del peru|tabla periodica)\b/i,
    category: 'materias académicas',
  },
  // Gastronomía y recetas de cocina
  {
    regex: /\b(receta|recetas|como cocinar|como preparar|ingredientes para|arroz con pollo|lomo saltado|aji de gallina|ceviche|causa limena|pie de limon)\b/i,
    category: 'gastronomía',
  },
  // Mecánica automotriz, legal y consultas médicas
  {
    regex: /\b(taller mecanico|mecanico automotriz|mecanica automotriz|cambio de aceite|reparar celular|abogado penalista|abogado laboral|demanda de alimentos|consulta medica|sintomas de|tratamiento de la gripe|comprar auto|vender auto|prestamo bancario|tipo de cambio)\b/i,
    category: 'servicios no relacionados',
  },
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Evalúa si una consulta está definitivamente fuera del dominio del baile y la danza.
 * Política de Alta Precisión:
 * 1. Si la consulta contiene un estilo o término explícito de baile (Salsa, Bachata, bailar, coreografía),
 *    NUNCA se considera fuera de dominio (isDefinitelyOutOfDomain: false).
 * 2. Si la consulta coincide con patrones ajenos (programación, recetas, matemáticas, etc.)
 *    y no menciona ningún estilo ni acción de baile, se marca con certeza como fuera de dominio.
 */
export function checkQueryDomain(
  query: string,
  knownStyles: string[] = []
): { isDefinitelyOutOfDomain: boolean; category?: string } {
  if (!query || !query.trim()) {
    return { isDefinitelyOutOfDomain: false };
  }

  const norm = normalizeText(query);

  // 1. Si contiene algún estilo de baile del catálogo activo -> SIEMPRE dentro de dominio
  const hasCatalogStyle = knownStyles.some(style => {
    const sNorm = normalizeText(style);
    return sNorm.length > 2 && norm.includes(sNorm);
  });
  if (hasCatalogStyle) {
    return { isDefinitelyOutOfDomain: false };
  }

  // 2. Si contiene términos inequívocos de baile -> SIEMPRE dentro de dominio
  const hasCoreDanceTerm = CORE_DANCE_TERMS.some(term => norm.includes(term));
  if (hasCoreDanceTerm) {
    return { isDefinitelyOutOfDomain: false };
  }

  // 3. Evaluar patrones fuertes fuera de dominio
  for (const { regex, category } of OUT_OF_DOMAIN_PATTERNS) {
    if (regex.test(norm)) {
      return { isDefinitelyOutOfDomain: true, category };
    }
  }

  return { isDefinitelyOutOfDomain: false };
}
