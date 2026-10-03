// lib/ai/filterParams.ts
//
// Filtros interpretados por la IA <-> parámetros de URL de /resultados.
// Cuando el usuario quita un chip, la página se recarga con r=1 más los
// filtros que quedan: así searchClassesWithAi se salta a Gemini y respeta
// exactamente lo que se ve en pantalla (incluso si ya no queda ningún filtro).
import type { AiSearchFilters } from './types';

type RawParams = Record<string, string | string[] | undefined>;

export type FilterChipKind =
  | 'style' | 'district' | 'city' | 'price' | 'days'
  | 'time' | 'modality' | 'level' | 'age' | 'tag';

export interface FilterChip {
  kind: FilterChipKind;
  label: string;
  /** Solo para kind === 'tag': el valor exacto a quitar. */
  value?: string;
}

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const TIME_LABELS: Record<NonNullable<AiSearchFilters['timeOfDay']>, string> = {
  morning: 'Mañana',
  afternoon: 'Tarde',
  evening: 'Noche',
  night: 'Noche',
};
const MODALITIES = ['Presencial', 'Online'] as const;
const MAX_TEXT = 60;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function text(v: string | string[] | undefined): string | undefined {
  const s = first(v)?.trim().slice(0, MAX_TEXT);
  return s ? s : undefined;
}

export function parseFilterParams(params: RawParams): {
  filters: AiSearchFilters;
  tags: string[];
  refined: boolean;
} {
  const filters: AiSearchFilters = {};

  const style = text(params.style);
  if (style) filters.style = style;
  const district = text(params.district);
  if (district) filters.district = district;
  const city = text(params.fcity);
  if (city) filters.city = city;

  const price = Number(first(params.price));
  if (Number.isFinite(price) && price > 0) filters.maxPrice = price;

  const days = (first(params.days) ?? '')
    .split(',')
    .map(d => d.trim())
    .filter(d => /^[0-6]$/.test(d))
    .map(Number);
  if (days.length > 0) filters.daysOfWeek = days;

  const modality = first(params.modality);
  if (MODALITIES.includes(modality as (typeof MODALITIES)[number])) {
    filters.modality = modality as AiSearchFilters['modality'];
  }
  const level = text(params.level);
  if (level) filters.level = level;
  const age = text(params.age);
  if (age) filters.ageGroup = age;

  const time = first(params.time);
  if (time && time in TIME_LABELS) filters.timeOfDay = time as AiSearchFilters['timeOfDay'];

  const tags = (first(params.tags) ?? '')
    .split(',')
    .map(t => t.trim().slice(0, MAX_TEXT))
    .filter(Boolean);

  return { filters, tags, refined: first(params.r) === '1' };
}

export function buildRefinementHref(
  query: string,
  city: string | undefined,
  filters: AiSearchFilters,
  tags: string[],
): string {
  const p = new URLSearchParams({ q: query });
  if (city) p.set('city', city);
  p.set('r', '1');
  if (filters.style) p.set('style', filters.style);
  if (filters.district) p.set('district', filters.district);
  if (filters.city) p.set('fcity', filters.city);
  if (filters.maxPrice) p.set('price', String(filters.maxPrice));
  if (filters.daysOfWeek?.length) p.set('days', filters.daysOfWeek.join(','));
  if (filters.timeOfDay) p.set('time', filters.timeOfDay);
  if (filters.modality) p.set('modality', filters.modality);
  if (filters.level) p.set('level', filters.level);
  if (filters.ageGroup) p.set('age', filters.ageGroup);
  if (tags.length) p.set('tags', tags.join(','));
  return `/resultados?${p.toString()}`;
}

export function buildFilterChips(filters: AiSearchFilters, tags: string[]): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.style) chips.push({ kind: 'style', label: filters.style });
  if (filters.district) chips.push({ kind: 'district', label: filters.district });
  if (filters.city) chips.push({ kind: 'city', label: filters.city });
  if (filters.maxPrice) chips.push({ kind: 'price', label: `Hasta S/ ${filters.maxPrice}` });
  if (filters.daysOfWeek?.length) {
    const label = [...filters.daysOfWeek].sort((a, b) => a - b).map(d => DAY_LABELS[d]).join(', ');
    chips.push({ kind: 'days', label });
  }
  if (filters.timeOfDay) chips.push({ kind: 'time', label: TIME_LABELS[filters.timeOfDay] });
  if (filters.modality) chips.push({ kind: 'modality', label: filters.modality });
  if (filters.level) chips.push({ kind: 'level', label: filters.level });
  if (filters.ageGroup) chips.push({ kind: 'age', label: filters.ageGroup });
  for (const tag of tags) chips.push({ kind: 'tag', label: tag, value: tag });
  return chips;
}

const KIND_TO_FILTER_KEYS: Record<Exclude<FilterChipKind, 'tag'>, (keyof AiSearchFilters)[]> = {
  style: ['style'],
  district: ['district'],
  city: ['city'],
  price: ['maxPrice'],
  days: ['daysOfWeek'],
  time: ['timeOfDay'],
  modality: ['modality'],
  level: ['level'],
  age: ['ageGroup'],
};

export function removeChip(
  filters: AiSearchFilters,
  tags: string[],
  chip: FilterChip,
): { filters: AiSearchFilters; tags: string[] } {
  if (chip.kind === 'tag') {
    return { filters: { ...filters }, tags: tags.filter(t => t !== chip.value) };
  }
  const next = { ...filters };
  for (const key of KIND_TO_FILTER_KEYS[chip.kind]) delete next[key];
  return { filters: next, tags: [...tags] };
}
