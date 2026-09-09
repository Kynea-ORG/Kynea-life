'use server';
// Server Action — HomeClient.tsx (Client Component) calls resolveSearch
// directly; the file must run server-side because searchProfilesByName's
// module (lib/profiles/queries.ts) also imports lib/supabase/server.ts,
// which depends on next/headers and cannot be bundled into client code.

import { searchProfilesByName } from '@/lib/profiles/queries';
import { fetchPublishedClasses } from '@/lib/classes/queries';
import { normalizeText, extractKeywords } from './normalize';

export type SearchResolution =
  | { type: 'style'; styleName: string; hasResults: boolean }
  | { type: 'profile'; role: 'profesor' | 'academia'; slug: string; name: string }
  | { type: 'ambiguous' };

async function matchStyle(
  normalizedTarget: string,
  danceStyles: { name: string }[]
): Promise<SearchResolution | null> {
  const styleMatch = danceStyles.find(s => normalizeText(s.name) === normalizedTarget);
  if (!styleMatch) return null;
  // Whether there's anything to actually show at /clases?style=X right now —
  // used only to decide if this counts as a "successful" search worth
  // remembering (see navigateSearch in HomeClient.tsx), not to change where
  // it routes: a temporarily-empty style page is still a valid destination.
  const classes = await fetchPublishedClasses({ styles: [styleMatch.name] });
  return { type: 'style', styleName: styleMatch.name, hasResults: classes.length > 0 };
}

async function matchProfile(
  searchTarget: string,
  normalizedTarget: string
): Promise<SearchResolution | null> {
  const candidates = await searchProfilesByName(searchTarget);
  const exactMatches = candidates.filter(c => normalizeText(c.name) === normalizedTarget);
  if (exactMatches.length !== 1) return null;
  const match = exactMatches[0];
  return { type: 'profile', role: match.type, slug: match.slug, name: match.name };
}

// Decide a dónde manda una búsqueda CONFIRMADA (botón "Buscar" / Enter del
// Home) — a diferencia de clickear una sugerencia del dropdown, que ya sabe
// exactamente a qué apunta. Antes de este fix, confirmar SIEMPRE mandaba a
// /clases?q=texto, una página que solo filtra por título de clase — buscar
// "Zeus" ahí daba "0 clases" aunque el propio dropdown ya lo encontraba.
//
// Reglas, en orden — cada nivel se prueba tal cual el usuario escribió antes
// de intentar "limpiar" la frase, así una academia cuyo nombre real
// contiene una de las palabras de relleno (poco probable, pero posible)
// nunca pierde su propio match exacto:
//  1. El texto TAL CUAL es el nombre de un estilo real (sin acentos/case) ->
//     'style'. Un estilo gana siempre sobre un profesor/academia con el
//     mismo nombre — "salsa" es casi siempre el estilo, no una coincidencia
//     de nombre.
//  2. Si no, el texto TAL CUAL coincide EXACTO con el nombre de un único
//     profesor o academia -> 'profile'. Dos o más coincidencias exactas
//     cuentan como ambiguo, no se adivina cuál.
//  3. Si no hubo match y la frase tiene "relleno" removible (artículos,
//     verbos, "profesor"/"academia", etc. — ver lib/search/normalize.ts),
//     se repiten los pasos 1 y 2 sobre la frase ya limpia. Esto es lo que
//     permite que "clases de salsa" resuelva a 'style' o "profesor Zeus
//     Villanueva" resuelva a 'profile' aunque no coincidan literalmente.
//  4. Cualquier otro caso (parcial, ambiguo, sin match) -> 'ambiguous', el
//     caller manda a /resultados con todo agrupado por tipo.
export async function resolveSearch(
  query: string,
  danceStyles: { name: string }[]
): Promise<SearchResolution> {
  const raw = query.trim();
  if (!raw) return { type: 'ambiguous' };
  const normalizedRaw = normalizeText(raw);

  const rawStyle = await matchStyle(normalizedRaw, danceStyles);
  if (rawStyle) return rawStyle;

  const rawProfile = await matchProfile(raw, normalizedRaw);
  if (rawProfile) return rawProfile;

  const cleaned = extractKeywords(raw).join(' ');
  const normalizedCleaned = normalizeText(cleaned);
  if (cleaned && normalizedCleaned !== normalizedRaw) {
    const cleanedStyle = await matchStyle(normalizedCleaned, danceStyles);
    if (cleanedStyle) return cleanedStyle;

    const cleanedProfile = await matchProfile(cleaned, normalizedCleaned);
    if (cleanedProfile) return cleanedProfile;
  }

  return { type: 'ambiguous' };
}
