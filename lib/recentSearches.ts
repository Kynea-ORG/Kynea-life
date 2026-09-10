// Client-only, per-device recent-search history for the Home "Búsquedas
// recientes" section (Notion: "Home: sección de búsquedas recientes bajo
// categorías"). Deliberately localStorage, not a DB table — this is
// per-device browsing history, not account data, so it never needs to sync
// across devices or survive a cleared browser, and needs no migration.

const STORAGE_KEY = 'kynea_recent_searches';
const MAX_ENTRIES = 5;

export interface RecentSearch {
  query: string;
  // What clicking this card does: repeats the exact same destination the
  // original search resolved to (a class, a profile, a style listing, or
  // /resultados) — not always a re-search of the raw text. See
  // lib/search/resolveSearch.ts, which is what decides that destination.
  href: string;
  // Short subtitle shown under the query on the card (class title, profile
  // name, style name) — empty for the /resultados (ambiguous) case, where
  // there's no single result to name.
  resultLabel: string;
  timestamp: number;
}

export function getRecentSearches(): RecentSearch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Recorded whenever a search is actually confirmed and resolves somewhere —
// a dropdown suggestion click, or the "Buscar" button/Enter once
// resolveSearch decides a target (see HomeClient.tsx's goToClass/goToProfile/
// navigateSearch). An abandoned search never gets an entry. Re-searching an
// already-recorded query moves it to the front instead of duplicating it.
export function recordRecentSearch(entry: Omit<RecentSearch, 'timestamp'>): void {
  if (typeof window === 'undefined' || !entry.query.trim()) return;
  try {
    const deduped = getRecentSearches().filter(
      s => s.query.toLowerCase() !== entry.query.toLowerCase()
    );
    const updated = [{ ...entry, timestamp: Date.now() }, ...deduped].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Storage full or disabled (private browsing) — recent searches are a
    // convenience, never worth surfacing an error for.
  }
}
