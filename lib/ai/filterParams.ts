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
  if (level) {
    const l = level.toLowerCase();
    if (!l.includes('adult') && !l.includes('niñ') && !l.includes('kid') && !l.includes('chibolo')) {
      filters.level = level;
    }
  }
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

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function isTagRedundantWithFilter(tag: string, filters: AiSearchFilters): boolean {
  const normTag = normalizeText(tag);
  if (!normTag) return true;

  // 1. Estilo
  if (filters.style) {
    const normStyle = normalizeText(filters.style);
    if (normTag === normStyle || normTag === `clases de ${normStyle}`) {
      return true;
    }
  }

  // 2. Distrito
  if (filters.district) {
    const normDist = normalizeText(filters.district);
    if (normTag === normDist) {
      return true;
    }
  }

  // 3. Ciudad
  if (filters.city) {
    const normCity = normalizeText(filters.city);
    if (normTag === normCity) {
      return true;
    }
  }

  // 4. Modalidad
  if (filters.modality) {
    const normMod = normalizeText(filters.modality);
    if (normTag === normMod) {
      return true;
    }
  }

  // 5. Nivel
  if (filters.level) {
    const normLevel = normalizeText(filters.level);
    if (normTag === normLevel) {
      return true;
    }
    if (
      normLevel.includes('principiante') ||
      normLevel.includes('iniciacion') ||
      normLevel.includes('cero') ||
      normLevel.includes('basico')
    ) {
      if (
        normTag.includes('principiante') ||
        normTag.includes('desde cero') ||
        normTag.includes('iniciacion') ||
        normTag.includes('sin experiencia') ||
        normTag.includes('basico')
      ) {
        return true;
      }
    } else if (normLevel.includes('intermedio') && normTag.includes('intermedio')) {
      return true;
    } else if (normLevel.includes('avanzado') && normTag.includes('avanzado')) {
      return true;
    }
  }

  // 6. Grupo etario
  if (filters.ageGroup) {
    const normAge = normalizeText(filters.ageGroup);
    if (normTag === normAge) {
      return true;
    }
    if (normAge.includes('adult') || normAge.includes('+18') || normAge.includes('mayor')) {
      if (normTag.includes('adult') || normTag.includes('+18') || normTag.includes('mayor')) {
        return true;
      }
    }
    if (
      normAge.includes('nin') ||
      normAge.includes('kid') ||
      normAge.includes('chibolo') ||
      normAge.includes('peque') ||
      normAge.includes('infantil')
    ) {
      if (
        normTag.includes('nin') ||
        normTag.includes('kid') ||
        normTag.includes('chibolo') ||
        normTag.includes('peque') ||
        normTag.includes('infantil')
      ) {
        return true;
      }
    }
  }

  // 7. Horario
  if (filters.timeOfDay) {
    if (filters.timeOfDay === 'morning') {
      if (normTag === 'manana' || normTag === 'mananas' || normTag.includes('horario manana')) {
        return true;
      }
    } else if (filters.timeOfDay === 'afternoon') {
      if (normTag === 'tarde' || normTag === 'tardes' || normTag.includes('horario tarde')) {
        return true;
      }
    } else if (filters.timeOfDay === 'evening' || filters.timeOfDay === 'night') {
      if (
        normTag === 'noche' ||
        normTag === 'noches' ||
        normTag.includes('horario nocturno') ||
        normTag.includes('post-trabajo') ||
        normTag.includes('post trabajo') ||
        normTag.includes('after office')
      ) {
        return true;
      }
    }
  }

  return false;
}

function isTagRelatedToChip(tag: string, chip: FilterChip): boolean {
  const normTag = normalizeText(tag);
  const normLabel = normalizeText(chip.label);
  if (!normTag) return true;
  if (normTag === normLabel || (chip.value && normTag === normalizeText(chip.value))) return true;

  switch (chip.kind) {
    case 'age':
      if (normLabel.includes('adult') || normLabel.includes('+18') || normLabel.includes('mayor')) {
        return normTag.includes('adult') || normTag.includes('+18') || normTag.includes('mayor');
      }
      if (
        normLabel.includes('nin') ||
        normLabel.includes('kid') ||
        normLabel.includes('chibolo') ||
        normLabel.includes('peque') ||
        normLabel.includes('infantil')
      ) {
        return (
          normTag.includes('nin') ||
          normTag.includes('kid') ||
          normTag.includes('chibolo') ||
          normTag.includes('peque') ||
          normTag.includes('infantil')
        );
      }
      return false;

    case 'level':
      if (
        normLabel.includes('principiante') ||
        normLabel.includes('iniciacion') ||
        normLabel.includes('cero') ||
        normLabel.includes('basico')
      ) {
        return (
          normTag.includes('principiante') ||
          normTag.includes('desde cero') ||
          normTag.includes('iniciacion') ||
          normTag.includes('sin experiencia') ||
          normTag.includes('basico')
        );
      }
      if (normLabel.includes('intermedio')) return normTag.includes('intermedio');
      if (normLabel.includes('avanzado')) return normTag.includes('avanzado');
      return false;

    case 'time':
      if (normLabel.includes('manana')) {
        return normTag === 'manana' || normTag === 'mananas' || normTag.includes('horario manana');
      }
      if (normLabel.includes('tarde')) {
        return normTag === 'tarde' || normTag === 'tardes' || normTag.includes('horario tarde');
      }
      if (normLabel.includes('noche')) {
        return normTag === 'noche' || normTag === 'noches' || normTag.includes('horario nocturno');
      }
      return false;

    case 'days':
      if (normLabel.includes(normTag) || normTag.includes(normLabel)) return true;
      return false;

    case 'style':
    case 'district':
    case 'city':
      return normTag === normLabel || normTag === `clases de ${normLabel}`;

    case 'modality':
      return normTag === normLabel;

    default:
      return false;
  }
}

export function buildFilterChips(filters: AiSearchFilters, tags: string[]): FilterChip[] {
  const chips: FilterChip[] = [];
  const seenLabels = new Set<string>();

  const addChip = (chip: FilterChip) => {
    const key = normalizeText(chip.label);
    if (!key || seenLabels.has(key)) return;
    seenLabels.add(key);
    chips.push(chip);
  };

  if (filters.style) addChip({ kind: 'style', label: filters.style });
  if (filters.district) addChip({ kind: 'district', label: filters.district });
  if (filters.city) addChip({ kind: 'city', label: filters.city });
  if (filters.maxPrice) addChip({ kind: 'price', label: `Hasta PEN ${filters.maxPrice}` });
  if (filters.daysOfWeek?.length) {
    const label = [...filters.daysOfWeek].sort((a, b) => a - b).map(d => DAY_LABELS[d]).join(', ');
    addChip({ kind: 'days', label });
  }
  if (filters.timeOfDay) addChip({ kind: 'time', label: TIME_LABELS[filters.timeOfDay] });
  if (filters.modality) addChip({ kind: 'modality', label: filters.modality });
  if (filters.level) {
    const l = filters.level.toLowerCase();
    if (!l.includes('adult') && !l.includes('niñ') && !l.includes('kid') && !l.includes('chibolo')) {
      addChip({ kind: 'level', label: filters.level });
    }
  }
  if (filters.ageGroup) addChip({ kind: 'age', label: filters.ageGroup });

  for (const tag of tags) {
    const trimmed = tag.trim();
    if (!trimmed) continue;
    if (isTagRedundantWithFilter(trimmed, filters)) continue;
    addChip({ kind: 'tag', label: trimmed, value: trimmed });
  }

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
    const target = normalizeText(chip.value || chip.label);
    return { filters: { ...filters }, tags: tags.filter(t => normalizeText(t) !== target) };
  }
  const next = { ...filters };
  for (const key of KIND_TO_FILTER_KEYS[chip.kind]) delete next[key];

  if (chip.kind === 'age' && next.level) {
    const l = next.level.toLowerCase();
    if (l.includes('adult') || l.includes('niñ') || l.includes('kid') || l.includes('chibolo')) {
      delete next.level;
    }
  }

  // Limpiar cualquier tag que esté directamente relacionado con el chip eliminado
  const remainingTags = tags.filter(t => !isTagRelatedToChip(t, chip));

  return { filters: next, tags: remainingTags };
}
