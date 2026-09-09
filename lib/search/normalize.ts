// Shared text-normalization for search matching — strips accents/case so
// "salsa", "Salsa" and "sálsa" all compare equal, and pulls the meaningful
// words out of a natural-language search phrase so intent behind something
// like "clases de salsa" or "profesor Zeus Villanueva" can still be matched
// against a plain style/profile name.

export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// Filler words people type around their real intent — verbs, articles,
// prepositions, and generic dance/role nouns that never narrow down a
// specific style, profesor or academia by themselves. None of these is
// itself a dance style or a name in the catalog, so dropping them never
// costs us a real match.
const STOPWORDS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'al',
  'en', 'con', 'sin', 'para', 'por', 'y', 'o', 'u', 'que', 'se', 'mi', 'tu', 'su',
  'quiero', 'quisiera', 'busco', 'buscar', 'necesito', 'deseo', 'encontrar',
  'aprender', 'bailar', 'baile', 'danza', 'clase', 'clases', 'curso', 'cursos',
  'taller', 'talleres',
  'profesor', 'profesora', 'profesores', 'profesoras', 'instructor', 'instructora',
  'academia', 'academias',
  'cerca', 'cercano', 'cercanos', 'cercana', 'cercanas',
]);

// Extracts, in order of first appearance and de-duplicated, the words that
// actually carry search intent — e.g. "clases de salsa" -> ["salsa"],
// "quiero un profesor de bachata cerca" -> ["bachata"]. An empty result
// means the whole phrase was filler (or already just one bare keyword),
// which the caller should treat as "cleaning found nothing new to try".
export function extractKeywords(query: string): string[] {
  const normalized = normalizeText(query);
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const word of normalized.split(/\s+/)) {
    if (word.length > 1 && !STOPWORDS.has(word) && !seen.has(word)) {
      seen.add(word);
      keywords.push(word);
    }
  }
  return keywords;
}

// The keywords a free-text search should actually run with — extractKeywords
// with a safety-net fallback to the whole normalized phrase on the rare
// query that's somehow all filler, so it still gets tried verbatim instead
// of silently matching nothing.
export function searchKeywords(query: string): string[] {
  const keywords = extractKeywords(query);
  if (keywords.length) return keywords;
  const whole = normalizeText(query);
  return whole ? [whole] : [];
}

// Whether every keyword shows up somewhere in `haystack` — the shared
// "every word must match somewhere" rule behind both the class list's live
// client-side filter and the server's free-text class search, so a phrase
// like "salsa miraflores" requires both words present, not just either one.
export function matchesAllKeywords(keywords: string[], haystack: string): boolean {
  if (!keywords.length) return true;
  const normalizedHaystack = normalizeText(haystack);
  return keywords.every(kw => normalizedHaystack.includes(kw));
}
